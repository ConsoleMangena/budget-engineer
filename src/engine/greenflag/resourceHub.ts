import type { Rate } from "@/types";
import type { BoqResult } from "@/adapters/designToBoq";
import type { ResourceRecord, DemandRadarEntry, DemandRadarReport } from "@/domain/greenflag";

export interface Resource {
  id: string;
  role: string;
  type: 'architect' | 'qs' | 'engineer-structural' | 'engineer-electrical' | 'engineer-mechanical' | 'engineer-soils' | 'artisan-plumber' | 'artisan-electrician' | 'artisan-builder' | 'artisan-landscaper' | 'sub-contractor' | 'supplier' | 'service-provider';
  name: string;
  company?: string;
  rating: number;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  avgDelayDays: number;
  totalProjects: number;
  reliabilityScore: number;
  wipaaHealthPct: number;
  specialization: string[];
  locationGps?: { lat: number; lng: number };
  locationLabel: string;
  verifiedBadge: boolean;
  creditScore: number;
  availableFrom?: string;
  servicesOffered: string[];
}

export interface ResourceFilter {
  role?: Resource['type'];
  locationLabel?: string;
  maxDistanceKm?: number;
  minRating?: number;
  minWipaaHealth?: number;
  specialization?: string;
  availableBefore?: string;
  serviceMode?: 'do-it-together' | 'do-it-for-them' | 'do-it-alone';
}

export interface DemandSignal {
  id: string;
  region: string;
  material: string;
  quantityUnits: number;
  deadline: string;
  projectCount?: number;
  contractorName?: string;
  projectType?: string;
  reliabilityPct?: number;
}

export function filterResources(resources: Resource[], filter: ResourceFilter): Resource[] {
  return resources.filter((r) => {
    if (filter.role && r.type !== filter.role) return false;
    if (filter.locationLabel && !r.locationLabel.toLowerCase().includes(filter.locationLabel.toLowerCase())) return false;
    if (filter.minRating && r.rating < filter.minRating) return false;
    if (filter.minWipaaHealth && r.wipaaHealthPct < filter.minWipaaHealth) return false;
    if (filter.specialization && !r.specialization.some((s) => s.toLowerCase().includes(filter.specialization!.toLowerCase()))) return false;
    if (filter.availableBefore && r.availableFrom && r.availableFrom > filter.availableBefore) return false;
    return true;
  });
}

export function rankResources(resources: Resource[]): Resource[] {
  return [...resources].sort((a, b) => {
    const scoreA = a.reliabilityScore * 0.3 + a.rating * 20 * 0.3 + a.wipaaHealthPct * 0.2 + (100 - a.defectRatePct) * 0.2;
    const scoreB = b.reliabilityScore * 0.3 + b.rating * 20 * 0.3 + b.wipaaHealthPct * 0.2 + (100 - b.defectRatePct) * 0.2;
    return scoreB - scoreA;
  });
}

export function matchResourceToDemand(resources: Resource[], demand: DemandSignal, topK = 5): Resource[] {
  const relevant = resources.filter((r) =>
    r.servicesOffered.some((s) => s.toLowerCase().includes(demand.material.toLowerCase())) ||
    r.specialization.some((s) => s.toLowerCase().includes(demand.material.toLowerCase())),
  );
  return rankResources(relevant).slice(0, topK);
}

export function aggregateDemand(signals: DemandSignal[]): { region: string; material: string; totalUnits: number; projectCount: number; deadline: string }[] {
  const map = new Map<string, { region: string; material: string; totalUnits: number; projectCount: number; deadline: string }>();
  for (const s of signals) {
    const key = `${s.region}|${s.material}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalUnits += s.quantityUnits;
      existing.projectCount += 1;
      if (s.deadline > existing.deadline) existing.deadline = s.deadline;
    } else {
      map.set(key, { region: s.region, material: s.material, totalUnits: s.quantityUnits, projectCount: 1, deadline: s.deadline });
    }
  }
  return [...map.values()];
}

export function greenFlagScore(resource: Resource): { score: number; tier: 'platinum' | 'gold' | 'silver' | 'bronze' } {
  const score = Math.round(
    resource.onTimeDeliveryPct * 0.3 +
    (100 - resource.defectRatePct) * 0.25 +
    resource.wipaaHealthPct * 0.25 +
    Math.min(resource.rating * 20, 100) * 0.2,
  );
  const tier = score >= 90 ? 'platinum' : score >= 75 ? 'gold' : score >= 60 ? 'silver' : 'bronze';
  return { score, tier };
}

/* --------------------------------------------------------------------------
 * C1 Resource Hub layer
 * ------------------------------------------------------------------------ */

/** Lock window: UTC midnight of the given day + 30 days (inclusive boundary). */
export function lockedUntilFor(now: Date): string {
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return new Date(base + 30 * 86400000).toISOString().slice(0, 10);
}

export const RESOURCE_LOCK_DAYS = 30;

export const hashStr = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

/** A rate is locked while the current UTC date is on or before the boundary. */
export function isLocked(until: string, now: Date): boolean {
  return now.toISOString().slice(0, 10) <= until;
}

const TRADE_KEYWORDS: Array<{ trade: string; keywords: string[] }> = [
  { trade: 'Cement & Concrete', keywords: ['cement', 'concrete', 'mortar', 'screed', 'render'] },
  { trade: 'Brick & Block', keywords: ['brick', 'block', 'masonry', 'clay'] },
  { trade: 'Steel & Reinforcement', keywords: ['rebar', 'steel', 'reinforcement', 'mesh'] },
  { trade: 'Timber & Joinery', keywords: ['timber', 'wood', 'joinery', 'formwork', 'door'] },
  { trade: 'Roofing & Cladding', keywords: ['roof', 'ibr', 'sheeting', 'cladding', 'truss', 'gutter', 'downpipe'] },
  { trade: 'Plumbing & Sanitary', keywords: ['plumb', 'pvc', 'u-pvc', 'drain', 'waste', 'sanitary', 'tap', 'wc', 'basin', 'shower'] },
  { trade: 'Electrical & Lighting', keywords: ['electrical', 'cable', 'conduit', 'switch', 'socket', 'light', 'db board', 'meter'] },
  { trade: 'Paints & Finishes', keywords: ['paint', 'emulsion', 'plaster', 'skimming', 'varnish', 'stain'] },
  { trade: 'Aggregates & Soil', keywords: ['sand', 'aggregate', 'stone', 'gravel', 'fill', 'soil', 'quarry'] },
  { trade: 'Glass & Glazing', keywords: ['glass', 'glazing', 'aluminium', 'aluminum'] },
  { trade: 'Insulation & Membranes', keywords: ['insulation', 'membrane', 'dpc', 'damp', 'waterproof', 'geofabric'] },
  { trade: 'General Materials', keywords: [] },
];

export function tradeForDescription(description: string): string {
  const lower = description.toLowerCase();
  for (const { trade, keywords } of TRADE_KEYWORDS) {
    if (keywords.length === 0) return trade;
    if (keywords.some((k) => lower.includes(k))) return trade;
  }
  return 'General Materials';
}

export interface ResourceHub {
  resources: ResourceRecord[];
  lockedUntil: string;
}

/**
 * Builds the C1 resource hub: BOQ line items first (unverified, 'rag' source),
 * then any rate-catalogue rows appended as verified 'market-index' resources.
 * Every resource shares one 30-day lock window.
 */
export function buildResourceHub(
  boq: BoqResult | null,
  rates: Rate[],
  opts: { projectId: string; now?: Date; region?: string },
): ResourceHub {
  const now = opts.now ?? new Date();
  const createdAt = now.toISOString();
  const lockedUntil = lockedUntilFor(now);
  const region = opts.region ?? 'zimbabwe';
  const resources: ResourceRecord[] = [];

  if (boq && boq.items) {
    for (const item of boq.items) {
      resources.push({
        id: `res-${opts.projectId}-boq-${item.id}`,
        projectId: opts.projectId,
        name: item.description,
        category: 'material',
        trade: tradeForDescription(item.description),
        verified: false,
        rating: 0,
        distanceKm: 0,
        baseRateCents: Math.round(item.rate * 100),
        unit: item.unit,
        region,
        source: 'rag',
        lockedUntil,
        createdAt,
      });
    }
  }

  for (const r of rates) {
    resources.push({
      id: `res-${opts.projectId}-rate-${r.id}`,
      projectId: opts.projectId,
      name: r.description,
      category: 'material',
      trade: tradeForDescription(r.description),
      verified: true,
      rating: 4.4,
      distanceKm: 0,
      baseRateCents: r.baseRateCents,
      unit: r.unit,
      region: r.region,
      source: 'market-index',
      lockedUntil,
      createdAt,
    });
  }

  return { resources, lockedUntil };
}

export interface DemandMaterial {
  material: string;
  unit: string;
  baseDemand: number;
  baseProjects: number;
  indexPriceCents: number;
}

const DEMAND_MATERIALS: DemandMaterial[] = [
  { material: 'Bricks', unit: 'thousand', baseDemand: 500000, baseProjects: 12, indexPriceCents: 129000 },
  { material: 'Cement 50kg', unit: 'bag', baseDemand: 180000, baseProjects: 14, indexPriceCents: 850 },
  { material: 'Rebar 12mm', unit: 'tonne', baseDemand: 24000, baseProjects: 9, indexPriceCents: 95000 },
  { material: 'River Sand', unit: 'tonne', baseDemand: 90000, baseProjects: 11, indexPriceCents: 28000 },
  { material: 'Aggregates', unit: 'tonne', baseDemand: 110000, baseProjects: 10, indexPriceCents: 32000 },
  { material: 'Paint 20L', unit: 'litre', baseDemand: 60000, baseProjects: 10, indexPriceCents: 4500 },
  { material: 'Roofing Sheets', unit: 'sheet', baseDemand: 75000, baseProjects: 8, indexPriceCents: 1200 },
  { material: 'Timber', unit: 'm3', baseDemand: 30000, baseProjects: 7, indexPriceCents: 155000 },
];

const QUARTER_SEASONALITY: Record<number, number> = { 1: 0.9, 2: 1.0, 3: 1.15, 4: 1.05 };

/**
 * Emits the deterministic demand radar for the four quarters following the
 * current one. Seasonality scales each material's base demand/projects per
 * quarter. Never includes identity, location or budget fields.
 */
export function buildDemandRadar(now: Date, region: string): DemandRadarReport {
  const currentQuarter = Math.floor(now.getUTCMonth() / 3) + 1;
  const entries: DemandRadarEntry[] = [];

  for (const m of DEMAND_MATERIALS) {
    for (let offset = 1; offset <= 4; offset += 1) {
      const seq = currentQuarter + offset;
      const year = now.getUTCFullYear() + Math.floor((seq - 1) / 4);
      const quarterNum = ((seq - 1) % 4) + 1;
      const multiplier = QUARTER_SEASONALITY[quarterNum] ?? 1;
      entries.push({
        region,
        quarter: `Q${quarterNum} ${year}`,
        material: m.material,
        unit: m.unit,
        demandUnits: Math.round(m.baseDemand * multiplier),
        activeProjects: Math.round(m.baseProjects * multiplier),
        indexPriceCents: m.indexPriceCents,
      });
    }
  }

  return { entries, generatedAt: now.toISOString(), lockedUntil: lockedUntilFor(now) };
}
