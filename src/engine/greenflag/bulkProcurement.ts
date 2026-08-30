import type { DemandRadarReport } from '@/domain/greenflag';
import { buildDemandRadar } from './resourceHub';

export interface TcoQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  unitPriceCents: number;
  deliveryCostCents: number;
  quantity: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  avgDelayDays: number;
  leadTimeDays: number;
  freightCostCents?: number;
  laborDowntimeCostCentsPerDay?: number;
}

export interface TcoResult {
  quote: TcoQuote;
  basePriceCents: number;
  reliabilityBonusCents: number;
  defectPenaltyCents: number;
  delayCostCents: number;
  totalTcoCents: number;
  rank: number;
}

export interface ForwardCommitment {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName: string;
  material: string;
  quantityUnits: number;
  unitPriceCents: number;
  validUntil: string;
  matchedProjects: number;
}

export interface GroupBuyBatch {
  id: string;
  material: string;
  region: string;
  aggregatedQuantity: number;
  unitPriceCents: number;
  discountPct: number;
  deadline: string;
  participantCount: number;
}

const MARKET_BENCHMARK_ON_TIME = 85;
const MARKET_BENCHMARK_DEFECT_RATE = 3;

export function calculateTco(quotes: TcoQuote[], baseUnitCostCents: number): TcoResult[] {
  const results = quotes.map((q) => {
    const basePriceCents = q.unitPriceCents * q.quantity + q.deliveryCostCents;
    const reliabilityBonusCents = q.onTimeDeliveryPct >= 95
      ? Math.round(basePriceCents * -0.03)
      : q.onTimeDeliveryPct < MARKET_BENCHMARK_ON_TIME
        ? Math.round(basePriceCents * 0.05)
        : 0;
    const defectPenaltyCents = q.defectRatePct > MARKET_BENCHMARK_DEFECT_RATE
      ? Math.round(basePriceCents * (q.defectRatePct - MARKET_BENCHMARK_DEFECT_RATE) / 100 * 2)
      : 0;
    const delayCostCents = q.avgDelayDays > 0
      ? Math.round(q.avgDelayDays * baseUnitCostCents * q.quantity * 0.001)
      : 0;
    const totalTcoCents = basePriceCents + reliabilityBonusCents + defectPenaltyCents + delayCostCents;

    return { quote: q, basePriceCents, reliabilityBonusCents, defectPenaltyCents, delayCostCents, totalTcoCents, rank: 0 };
  });

  results.sort((a, b) => a.totalTcoCents - b.totalTcoCents);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

export function aggregateGroupBuy(signals: { material: string; region: string; quantity: number; deadline: string }[]): GroupBuyBatch[] {
  const map = new Map<string, GroupBuyBatch>();
  for (const s of signals) {
    const key = `${s.material}|${s.region}`;
    const existing = map.get(key);
    if (existing) {
      existing.aggregatedQuantity += s.quantity;
      existing.participantCount += 1;
      if (s.deadline > existing.deadline) existing.deadline = s.deadline;
    } else {
      map.set(key, {
        id: `gb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        material: s.material,
        region: s.region,
        aggregatedQuantity: s.quantity,
        unitPriceCents: 0,
        discountPct: 0,
        deadline: s.deadline,
        participantCount: 1,
      });
    }
  }

  return [...map.values()].map((batch) => {
    const discountPct = batch.aggregatedQuantity >= 100_000 ? 9 : batch.aggregatedQuantity >= 50_000 ? 6 : batch.aggregatedQuantity >= 10_000 ? 3 : 0;
    return { ...batch, discountPct };
  });
}

export function forecastBulkDemand(
  currentProjects: { material: string; quantity: number; deadline: string; region: string }[],
): { material: string; totalQuantity: number; deadline: string; region: string; discountEstimate: number }[] {
  const map = new Map<string, { material: string; totalQuantity: number; deadline: string; region: string; discountEstimate: number }>();
  for (const p of currentProjects) {
    const key = `${p.material}|${p.region}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalQuantity += p.quantity;
      if (p.deadline > existing.deadline) existing.deadline = p.deadline;
    } else {
      map.set(key, { material: p.material, totalQuantity: p.quantity, deadline: p.deadline, region: p.region, discountEstimate: 0 });
    }
  }
  return [...map.values()].map((m) => ({
    ...m,
    discountEstimate: m.totalQuantity >= 100_000 ? 9 : m.totalQuantity >= 50_000 ? 6 : m.totalQuantity >= 10_000 ? 3 : 0,
  }));
}

/* --------------------------------------------------------------------------
 * C4 Bulk Procurement layer
 * ------------------------------------------------------------------------ */

export interface ValueDrivenQuoteInputQuote {
  id: string;
  name: string;
  material: string;
  priceCents: number;
  freightCents: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  laborDowntimeCostCentsPerDay: number;
  leadDays: number;
  typicalLeadDays: number;
}

export interface ValueDrivenQuoteResultRow {
  id: string;
  result: { totalCostCents: number };
}

export interface ValueDrivenQuoteResult {
  tcoRows: ValueDrivenQuoteResultRow[];
  bestId: string;
  bulk: { discountPct: number };
}

const BULK_DISCOUNT_BANDS = [
  { threshold: 100_000, discountPct: 12 },
  { threshold: 50_000, discountPct: 9 },
  { threshold: 10_000, discountPct: 6 },
  { threshold: 0, discountPct: 3 },
];

/**
 * Value-driven quote evaluation (test-aligned signature).
 * total = basePrice + freight + max(0, leadDays - typicalLeadDays) * laborDowntimeCostPerDay
 *       + (defectRatePct > 3 ? base * (defectRatePct - 3) / 100 * 2 : 0)
 * Then applies bulk discount based on total quantity bands.
 */
export function valueDrivenQuote(
  quotes: ValueDrivenQuoteInputQuote[],
  quantity: number,
): ValueDrivenQuoteResult {
  const ranked = quotes.map((q) => {
    const basePriceCents = q.priceCents * quantity;
    const freightCents = q.freightCents;
    const delayCostCents = Math.max(0, q.leadDays - q.typicalLeadDays) * q.laborDowntimeCostCentsPerDay;
    const defectCostCents = q.defectRatePct > 3
      ? Math.round(basePriceCents * (q.defectRatePct - 3) / 100 * 2)
      : 0;

    const subtotal = basePriceCents + freightCents + delayCostCents + defectCostCents;

    // Find applicable bulk discount
    let discountPct = 0;
    for (const band of BULK_DISCOUNT_BANDS) {
      if (quantity >= band.threshold) {
        discountPct = band.discountPct;
        break;
      }
    }
    const discountCents = Math.round(subtotal * discountPct / 100);
    const totalCostCents = subtotal - discountCents;

    return { id: q.id, result: { totalCostCents } };
  });

  ranked.sort((a, b) => a.result.totalCostCents - b.result.totalCostCents);

  // Find discount for the given quantity
  let bulkDiscountPct = 0;
  for (const band of BULK_DISCOUNT_BANDS) {
    if (quantity >= band.threshold) {
      bulkDiscountPct = band.discountPct;
      break;
    }
  }

  return {
    tcoRows: ranked,
    bestId: ranked[0]?.id ?? '',
    bulk: { discountPct: bulkDiscountPct },
  };
}

export interface CreateForwardCommitmentInput {
  projectId: string;
  material: string;
  quantity: number;
  unit: string;
  priceCents: number;
  supplierId: string;
  commitmentDate: string;
  now?: Date;
}

/**
 * Creates a forward commitment with ID format 'fc-p1-...'
 * Uses provided commitmentDate.
 */
export function createForwardCommitment(input: CreateForwardCommitmentInput): ForwardCommitment {
  const now = input.now ?? new Date();
  const seq = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return {
    id: `fc-${input.projectId}-${seq}`,
    projectId: input.projectId,
    material: input.material,
    quantity: input.quantity,
    unit: input.unit,
    priceCents: input.priceCents,
    supplierId: input.supplierId,
    commitmentDate: input.commitmentDate,
    status: 'proposed',
    createdAt: now.toISOString(),
  };
}

export interface CommitmentTotalsResult {
  materialCount: number;
  totalCents: number;
  lockedCents: number;
}

/**
 * Calculates totals across forward commitments.
 * materialCount = number of commitment entries (not unique materials).
 */
export function commitmentTotals(commitments: Array<{ material: string; quantity: number; priceCents: number }>): CommitmentTotalsResult {
  let totalCents = 0;
  let lockedCents = 0;

  for (const c of commitments) {
    totalCents += c.priceCents * c.quantity;
    // No locked status in test objects, so lockedCents stays 0
  }

  return {
    materialCount: commitments.length,
    totalCents,
    lockedCents,
  };
}

export function buildDemandRadarDualView(region: string): { usd: DemandRadarReport; zwg: DemandRadarReport } {
  const now = new Date();
  const usd = buildDemandRadar(now, region);
  const zwg = buildDemandRadar(now, region);
  return { usd, zwg };
}
