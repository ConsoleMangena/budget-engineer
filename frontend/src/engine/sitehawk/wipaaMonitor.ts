// Backward compatibility types
export interface WipSnapshot {
  id: string;
  projectId: string;
  monthKey: string;
  contractValueCents: number;
  costsIncurredCents: number;
  totalEstimatedCostsCents: number;
  billedToDateCents: number;
  computedAt: string;
  source: 'auto' | 'manual';
}

export interface SolvencyCheck {
  id: string;
  projectId: string;
  date: string;
  wipaaResult: 'under-billed' | 'over-billed' | 'on-track';
  overUnderCents: number;
  costPctComplete: number;
  revenueEarnedCents: number;
  projectedProfitCents: number;
  contractedOutstandingCents: number;
  alertLevel: 'green' | 'amber' | 'red';
  alertReason: string;
}

export interface WipaaEntry {
  id: string;
  projectId: string;
  monthKey: string;
  billedCents: number;
  incurredCents: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  status: 'on-track' | 'under-billed' | 'over-billed';
  escalationPct: number;
  alertLevel: 'green' | 'amber' | 'red';
  createdAt: string;
}

export interface GainFadeRow {
  description: string;
  baselineCents: number;
  actualCents: number;
  deltaCents: number;
  verdict: 'gain' | 'fade' | 'on-target';
}

export interface HandoverItem {
  id: string;
  label: string;
  category: 'digital' | 'physical';
  checked: boolean;
}

export interface HandoverPack {
  digital: string[];
  physical: string[];
  completed: boolean;
}

export interface PnlRow {
  description: string;
  costCents: number;
  revenueCents: number;
  marginCents: number;
  marginPct: number;
}

export interface SolvencyTrendResult {
  months: Array<{ monthKey: string; ratio: number; alertLevel: 'green' | 'amber' | 'red' }>;
  currentRatio: number;
  avgRatio: number;
  minRatio: number;
  maxRatio: number;
  alertLevel: 'green' | 'amber' | 'red';
}

export interface ContingencySpendDownResult {
  spentPct: number;
  remainingCents: number;
  alertLevel: 'healthy' | 'caution' | 'warning' | 'critical';
  monthlyBurnCents: number;
  projectedExhaustedMonthKey: string | null;
  spentCents: number;
}

export interface WipaaSummaryResult {
  monthCount: number;
  latest: { monthKey: string; alertLevel: 'green' | 'amber' | 'red'; escalationPct: number } | null;
  alerts: { green: number; amber: number; red: number };
  totalOverUnderBilledCents: number;
}

export interface MonthlyCashflowRow {
  monthKey: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
  cumulativeCents: number;
}

export interface HandoverChecklistResult {
  items: HandoverItem[];
  totalItems: number;
  checkedItems: number;
  completionPct: number;
  digitalCompletionPct: number;
  physicalCompletionPct: number;
  digital: string[];
  physical: string[];
  completed: boolean;
}

export interface SignOffResult {
  signerName: string;
  itemsSignedOff: number;
  allComplete: boolean;
  signedAt: string;
}

export const WIPAA_ALERT_THRESHOLDS = { green: 90, amber: 70 } as const;

export function alertLevelFor(ratioPct: number): 'green' | 'amber' | 'red' {
  if (ratioPct >= 90) return 'green';
  if (ratioPct >= 70) return 'amber';
  return 'red';
}

export interface WipSnapshot {
  id: string;
  projectId: string;
  monthKey: string;
  contractValueCents: number;
  costsIncurredCents: number;
  totalEstimatedCostsCents: number;
  billedToDateCents: number;
  computedAt: string;
  source: 'auto' | 'manual';
}

export function calculateWipaaFromSnapshot(snapshot: WipSnapshot): {
  costPctComplete: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  billingStatus: 'under-billed' | 'over-billed' | 'on-track';
  projectedProfitCents: number;
  projectedProfitPct: number;
} {
  const totalEst = snapshot.totalEstimatedCostsCents || snapshot.contractValueCents;
  const costPctComplete = totalEst > 0 ? Math.round(snapshot.costsIncurredCents / totalEst * 10000) / 10000 : 0;
  const revenueEarnedCents = Math.round(snapshot.contractValueCents * costPctComplete);
  const overUnderBilledCents = revenueEarnedCents - snapshot.billedToDateCents;
  const billingStatus: 'under-billed' | 'over-billed' | 'on-track' =
    Math.abs(overUnderBilledCents) < snapshot.contractValueCents * 0.01 ? 'on-track'
      : overUnderBilledCents > 0 ? 'under-billed'
        : 'over-billed';
  const grossProfit = snapshot.contractValueCents - snapshot.costsIncurredCents;
  return {
    costPctComplete,
    revenueEarnedCents,
    overUnderBilledCents,
    billingStatus,
    projectedProfitCents: grossProfit,
    projectedProfitPct: snapshot.contractValueCents > 0 ? Math.round(grossProfit / snapshot.contractValueCents * 10000) / 100 : 0,
  };
}

export function buildWipaaEntry(input: {
  projectId: string;
  monthKey: string;
  billedCents: number;
  incurredCents: number;
  revenueEarnedCents: number;
  overUnderBilledCents: number;
  status: 'on-track' | 'under-billed' | 'over-billed';
  createdAt?: string;
}): WipaaEntry {
  const escalationPct = input.incurredCents > 0
    ? Math.round((input.revenueEarnedCents / input.incurredCents) * 100)
    : 0;
  return {
    id: `we-${input.projectId}-${input.monthKey}`,
    projectId: input.projectId,
    monthKey: input.monthKey,
    billedCents: input.billedCents,
    incurredCents: input.incurredCents,
    revenueEarnedCents: input.revenueEarnedCents,
    overUnderBilledCents: input.overUnderBilledCents,
    status: input.status,
    escalationPct,
    alertLevel: alertLevelFor(escalationPct),
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function wipaaSummary(entries: WipaaEntry[]): WipaaSummaryResult {
  if (entries.length === 0) {
    return { monthCount: 0, latest: null, alerts: { green: 0, amber: 0, red: 0 }, totalOverUnderBilledCents: 0 };
  }
  const sorted = [...entries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const latest = sorted[sorted.length - 1];
  const alerts = { green: 0, amber: 0, red: 0 };
  for (const e of sorted) {
    if (e.alertLevel === 'green') alerts.green++;
    else if (e.alertLevel === 'amber') alerts.amber++;
    else alerts.red++;
  }
  const totalOverUnderBilledCents = sorted.reduce((sum, e) => sum + e.overUnderBilledCents, 0);
  return {
    monthCount: sorted.length,
    latest: { monthKey: latest.monthKey, alertLevel: latest.alertLevel, escalationPct: latest.escalationPct },
    alerts,
    totalOverUnderBilledCents,
  };
}

export function analyzeGainFade(rows: Array<{ description: string; baselineCents: number; actualCents: number }>): GainFadeRow[] {
  return rows.map((r) => {
    const delta = r.actualCents - r.baselineCents;
    const pct = r.baselineCents > 0 ? (delta / r.baselineCents) * 100 : 0;
    let verdict: 'gain' | 'fade' | 'on-target' = 'on-target';
    if (pct > 5) verdict = 'fade';
    else if (pct < -5) verdict = 'gain';
    return { description: r.description, baselineCents: r.baselineCents, actualCents: r.actualCents, deltaCents: delta, verdict };
  });
}

export function solvencyTrend(entries: WipaaEntry[]): SolvencyTrendResult {
  if (entries.length === 0) {
    return { months: [], currentRatio: 0, avgRatio: 0, minRatio: 0, maxRatio: 0, alertLevel: 'red' };
  }
  const sorted = [...entries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const months = sorted.map((e) => {
    const ratio = e.incurredCents > 0 ? e.billedCents / e.incurredCents : 0;
    const rounded = Math.round(ratio * 100) / 100;
    return { monthKey: e.monthKey, ratio: rounded, alertLevel: alertLevelFor(rounded * 100) };
  });
  const ratios = months.map((m) => m.ratio);
  const currentRatio = ratios[ratios.length - 1] ?? 0;
  const avgRatio = Math.round((ratios.reduce((s, r) => s + r, 0) / ratios.length) * 100) / 100;
  const minRatio = Math.min(...ratios);
  const maxRatio = Math.max(...ratios);
  const alertLevel = alertLevelFor(currentRatio * 100);
  return { months, currentRatio, avgRatio, minRatio, maxRatio, alertLevel };
}

export function contingencyAlertLevel(spentPct: number): 'healthy' | 'caution' | 'warning' | 'critical' {
  if (spentPct < 50) return 'healthy';
  if (spentPct < 70) return 'caution';
  if (spentPct < 90) return 'warning';
  return 'critical';
}

export function contingencySpendDown(
  contingencyCents: number,
  entries: Array<{ monthKey: string; spentCents: number }>
): ContingencySpendDownResult {
  const totalSpent = entries.reduce((sum, e) => sum + e.spentCents, 0);
  const remaining = Math.max(0, contingencyCents - totalSpent);
  const spentPct = contingencyCents > 0 ? Math.round((totalSpent / contingencyCents) * 100) : 0;
  const alertLevel = contingencyAlertLevel(spentPct);

  const monthlyBurnCents = entries.length > 0
    ? Math.round(totalSpent / entries.length)
    : 0;

  let projectedExhaustedMonthKey: string | null = null;
  if (monthlyBurnCents > 0 && remaining > 0 && entries.length > 0) {
    const monthsLeft = Math.floor(remaining / monthlyBurnCents);
    const lastMonth = entries[entries.length - 1].monthKey;
    const [year, month] = lastMonth.split('-').map(Number);
    const futureMonth = month + monthsLeft;
    const futureYear = year + Math.floor((futureMonth - 1) / 12);
    const futureM = ((futureMonth - 1) % 12) + 1;
    projectedExhaustedMonthKey = `${futureYear}-${String(futureM).padStart(2, '0')}`;
  }

  return { spentCents: totalSpent, remainingCents: remaining, spentPct, alertLevel, monthlyBurnCents, projectedExhaustedMonthKey };
}

export function monthlyCashflow(entries: WipaaEntry[]): MonthlyCashflowRow[] {
  const sorted = [...entries].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  let cumulative = 0;
  return sorted.map((e) => {
    const inflow = e.billedCents;
    const outflow = e.incurredCents;
    const net = inflow - outflow;
    cumulative += net;
    return { monthKey: e.monthKey, inflowCents: inflow, outflowCents: outflow, netCents: net, cumulativeCents: cumulative };
  });
}

const HANDOVER_DIGITAL = [
  'As-built floor plans & elevations',
  'Building model (GLB)',
  'Warranty certificates',
  'O&M manuals',
  'Final account & lien waivers',
];

const HANDOVER_PHYSICAL = [
  'Keys (main + duplicates)',
  'Remote controls & gate transmitters',
  'Water meter key',
  'Electrical DB schedule',
];

export function buildHandoverChecklist(overrides?: Record<string, boolean>): HandoverChecklistResult {
  const allItems = [...HANDOVER_DIGITAL, ...HANDOVER_PHYSICAL];
  const checkedFlags = overrides ?? {};
  const items: HandoverItem[] = allItems.map((label, i) => ({
    id: `hi-${i}`,
    label,
    category: i < HANDOVER_DIGITAL.length ? 'digital' : 'physical',
    checked: checkedFlags[label] ?? false,
  }));

  const checkedItems = items.filter((i) => i.checked).length;
  const totalItems = items.length;
  const completionPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  const digitalItems = items.filter((i) => i.category === 'digital');
  const digitalChecked = digitalItems.filter((i) => i.checked).length;
  const digitalCompletionPct = digitalItems.length > 0 ? Math.round((digitalChecked / digitalItems.length) * 100) : 0;

  const physicalItems = items.filter((i) => i.category === 'physical');
  const physicalChecked = physicalItems.filter((i) => i.checked).length;
  const physicalCompletionPct = physicalItems.length > 0 ? Math.round((physicalChecked / physicalItems.length) * 100) : 0;

  const completed = checkedItems === totalItems;

  return {
    items,
    totalItems,
    checkedItems,
    completionPct,
    digitalCompletionPct,
    physicalCompletionPct,
    digital: HANDOVER_DIGITAL,
    physical: HANDOVER_PHYSICAL,
    completed,
  };
}

export function signOffHandover(
  checklist: HandoverChecklistResult,
  signerName: string,
  signedAt?: string
): SignOffResult {
  return {
    signerName,
    itemsSignedOff: checklist.checkedItems,
    allComplete: checklist.completed,
    signedAt: signedAt ?? new Date().toISOString(),
  };
}

export function buildPnl(ledgerLines: Array<{ costCents: number }>, revenueCents: number): PnlRow[] {
  const totalCost = ledgerLines.reduce((s, l) => s + l.costCents, 0);
  const marginCents = revenueCents - totalCost;
  const marginPct = totalCost > 0 ? Math.round((marginCents / totalCost) * 1000) / 10 : 0;
  return [{ description: 'Total', costCents: totalCost, revenueCents, marginCents, marginPct }];
}

export function buildHandoverPack(overrides: Record<string, boolean>): HandoverPack {
  const allFlags = { ...overrides };
  const digitalDone = HANDOVER_DIGITAL.every((d) => allFlags[d] === true);
  const physicalDone = HANDOVER_PHYSICAL.every((p) => allFlags[p] === true);
  return { digital: HANDOVER_DIGITAL, physical: HANDOVER_PHYSICAL, completed: digitalDone && physicalDone };
}

export function solvencyRatioFor(entry: WipaaEntry): { ratio: number; alertLevel: 'green' | 'amber' | 'red'; monthKey: string } {
  const ratio = entry.incurredCents > 0 ? entry.billedCents / entry.incurredCents : 0;
  return { ratio: Math.round(ratio * 100) / 100, alertLevel: alertLevelFor(ratio * 100), monthKey: entry.monthKey };
}

export function runSolvencyCheck(
  projectId: string,
  snapshot: WipSnapshot,
  contractedOutstandingCents: number,
): SolvencyCheck {
  const wip = calculateWipaaFromSnapshot(snapshot);
  const overUnderPct = snapshot.contractValueCents > 0 ? Math.abs(wip.overUnderBilledCents) / snapshot.contractValueCents : 0;

  let alertLevel: SolvencyCheck['alertLevel'] = 'green';
  let alertReason = 'Project on track';
  if (overUnderPct > 0.15) { alertLevel = 'red'; alertReason = `Over/under-billing exceeds 15% (${Math.round(overUnderPct * 100)}%)`; }
  else if (overUnderPct > 0.05) { alertLevel = 'amber'; alertReason = `Over/under-billing above 5% threshold (${Math.round(overUnderPct * 100)}%)`; }

  return {
    id: `sc-${projectId}-${Date.now()}`,
    projectId,
    date: new Date().toISOString(),
    wipaaResult: wip.billingStatus,
    overUnderCents: wip.overUnderBilledCents,
    costPctComplete: wip.costPctComplete,
    revenueEarnedCents: wip.revenueEarnedCents,
    projectedProfitCents: wip.projectedProfitCents,
    contractedOutstandingCents,
    alertLevel,
    alertReason,
  };
}

export function handoverProgress(checklist: HandoverChecklistResult): {
  totalItems: number;
  completedItems: number;
  byCategory: Map<string, { total: number; completed: number }>;
  overallPct: number;
  allComplete: boolean;
} {
  const byCategory = new Map<string, { total: number; completed: number }>();
  for (const item of checklist.items) {
    const existing = byCategory.get(item.category) ?? { total: 0, completed: 0 };
    existing.total++;
    if (item.checked) existing.completed++;
    byCategory.set(item.category, existing);
  }
  const completedItems = checklist.items.filter((i) => i.checked).length;
  return {
    totalItems: checklist.items.length,
    completedItems,
    byCategory,
    overallPct: Math.round(completedItems / checklist.items.length * 100),
    allComplete: completedItems === checklist.items.length,
  };
}