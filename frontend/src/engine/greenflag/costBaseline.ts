export interface CostBaselineItem {
  wbsCode: string;
  description: string;
  category: 'material' | 'labour' | 'equipment' | 'subcontract' | 'overhead';
  quantity: number;
  unit: string;
  unitCostCents: number;
  totalCostCents: number;
  supplierId?: string;
  deliveryStatus: 'pending' | 'ordered' | 'delivered' | 'installed';
  actualCostCents?: number;
  varianceCents?: number;
}

export interface CostBaseline {
  id: string;
  projectId: string;
  version: number;
  totalBudgetCents: number;
  contingencyCents: number;
  contingencyPct: number;
  items: CostBaselineItem[];
  locked: boolean;
  lockedUntil?: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface P4pEnvelope {
  directCosts: { label: string; amountCents: number }[];
  subtotalDirectCents: number;
  overheadPct: number;
  overheadCents: number;
  profitPct: number;
  profitCents: number;
  totalBidCents: number;
}

export interface CashflowForecast {
  months: { month: number; inflowCents: number; outflowCents: number; cumulativeCents: number }[];
  totalInflowCents: number;
  totalOutflowCents: number;
  nextCashflowDate: string;
  nextCashflowCents: number;
}

export interface ValueEngineeringSuggestion {
  id: string;
  originalItem: string;
  suggestedAlternative: string;
  originalCostCents: number;
  suggestedCostCents: number;
  savingCents: number;
  reason: string;
  impact: 'low' | 'medium' | 'high';
}

export function buildCostBaseline(
  projectId: string,
  items: CostBaselineItem[],
  contingencyPct = 9,
): CostBaseline {
  const totalItemsCents = items.reduce((sum, i) => sum + i.totalCostCents, 0);
  const contingencyCents = Math.round(totalItemsCents * contingencyPct / 100);

  return {
    id: `bl-${projectId}-${Date.now()}`,
    projectId,
    version: 1,
    totalBudgetCents: totalItemsCents + contingencyCents,
    contingencyCents,
    contingencyPct,
    items,
    locked: false,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function lockCostBaseline(baseline: CostBaseline, lockDays = 30): CostBaseline {
  const lockDate = new Date();
  lockDate.setDate(lockDate.getDate() + lockDays);
  return {
    ...baseline,
    locked: true,
    lockedUntil: lockDate.toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function buildP4pEnvelope(
  labourHours: number,
  hourlyRateCents: number,
  materialCostCents: number,
  equipmentDays: number,
  dailyEquipmentCents: number,
  overheadPct = 15,
  profitPct = 12,
): P4pEnvelope {
  const labour = labourHours * hourlyRateCents;
  const materials = materialCostCents;
  const equipment = equipmentDays * dailyEquipmentCents;
  const subtotalDirectCents = labour + materials + equipment;
  const overheadCents = Math.round(subtotalDirectCents * overheadPct / 100);
  const profitCents = Math.round(subtotalDirectCents * profitPct / 100);

  return {
    directCosts: [
      { label: `Labour ${labourHours}hrs @ $${(hourlyRateCents / 100).toFixed(2)}/hr`, amountCents: labour },
      { label: 'Materials from BOQ', amountCents: materials },
      { label: `Equipment ${equipmentDays} days`, amountCents: equipment },
    ],
    subtotalDirectCents,
    overheadPct,
    overheadCents,
    profitPct,
    profitCents,
    totalBidCents: subtotalDirectCents + overheadCents + profitCents,
  };
}

export function forecastCashflow(
  baseline: CostBaseline,
  projectDurationMonths: number,
): { month: number; inflowCents: number; outflowCents: number; cumulativeCents: number }[] {
  const monthlyBudget = Math.round(baseline.totalBudgetCents / projectDurationMonths);
  const result: { month: number; inflowCents: number; outflowCents: number; cumulativeCents: number }[] = [];
  let cumulative = 0;

  for (let m = 1; m <= projectDurationMonths; m++) {
    const inflow = monthlyBudget;
    const outflow = Math.round(monthlyBudget * (0.8 + Math.random() * 0.4));
    cumulative += inflow - outflow;
    result.push({ month: m, inflowCents: inflow, outflowCents: outflow, cumulativeCents: cumulative });
  }

  return result;
}

export function valueEngineer(
  baseline: CostBaseline,
  marketIndex?: Map<string, number>,
): ValueEngineeringSuggestion[] {
  const suggestions: ValueEngineeringSuggestion[] = [];
  let id = 0;

  for (const item of baseline.items) {
    if (item.category === 'material' && marketIndex) {
      const marketPrice = marketIndex.get(item.description.toLowerCase());
      if (marketPrice && marketPrice < item.unitCostCents * 0.85) {
        const saving = Math.round((item.unitCostCents - marketPrice) * item.quantity);
        suggestions.push({
          id: `ve-${++id}`,
          originalItem: item.description,
          suggestedAlternative: `Market-rate alternative for ${item.description}`,
          originalCostCents: item.totalCostCents,
          suggestedCostCents: Math.round(marketPrice * item.quantity),
          savingCents: saving,
          reason: `SADC Market Price Index shows lower rate for ${item.description}`,
          impact: saving > baseline.contingencyCents * 0.1 ? 'high' : saving > baseline.contingencyCents * 0.03 ? 'medium' : 'low',
        });
      }
    }
  }

  return suggestions;
}

export function generateCashflowForecast(
  baseline: CostBaseline,
  projectDurationMonths: number = 12,
  startMonthStr: string = new Date().toISOString().slice(0, 7),
): CashflowForecast {
  const monthlyBudget = Math.round(baseline.totalBudgetCents / projectDurationMonths);
  const months: CashflowForecast['months'] = [];
  let cumulative = 0;
  const [startYear, startMonth] = startMonthStr.split('-').map(Number);

  for (let i = 0; i < projectDurationMonths; i++) {
    const monthNum = startMonth + i;
    const year = startYear + Math.floor((monthNum - 1) / 12);
    const month = ((monthNum - 1) % 12) + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const inflow = monthlyBudget;
    const outflow = Math.round(monthlyBudget * 0.85);
    cumulative += inflow - outflow;

    months.push({ month: i + 1, inflowCents: inflow, outflowCents: outflow, cumulativeCents: cumulative });
  }

  const nextMonth = months.find((m) => m.inflowCents > 0);
  return {
    months,
    totalInflowCents: months.reduce((s, m) => s + m.inflowCents, 0),
    totalOutflowCents: months.reduce((s, m) => s + m.outflowCents, 0),
    nextCashflowDate: nextMonth ? `${startYear}-${String(startMonth).padStart(2, '0')}` : '',
    nextCashflowCents: nextMonth?.inflowCents ?? 0,
  };
}

export function valueEngineSuggestions(
  baseline: CostBaseline,
  marketIndex?: Map<string, number>,
): ValueEngineeringSuggestion[] {
  return valueEngineer(baseline, marketIndex);
}

export function budgetAtAGlance(baseline: CostBaseline, spentCents: number): {
  totalBudgetCents: number;
  spentCents: number;
  remainingCents: number;
  contingencyCents: number;
  spentPct: number;
  status: 'on-track' | 'caution' | 'over-budget';
} {
  const remainingCents = baseline.totalBudgetCents - spentCents;
  const spentPct = Math.round(spentCents / baseline.totalBudgetCents * 100);
  const status = spentCents > baseline.totalBudgetCents ? 'over-budget' : spentCents > baseline.totalBudgetCents * 0.9 ? 'caution' : 'on-track';
  return { totalBudgetCents: baseline.totalBudgetCents, spentCents, remainingCents, contingencyCents: baseline.contingencyCents, spentPct, status };
}
