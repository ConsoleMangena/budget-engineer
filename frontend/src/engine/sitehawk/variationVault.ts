export type ChangeStatus = 'proposed' | 'quoted' | 'approved' | 'applied' | 'rejected' | 'disputed';

export type LensName = 'red-pen' | 'wipaa' | 'true-ledger' | 'budget-engineer';

export const VARIATION_LENSES: LensName[] = ['red-pen', 'wipaa', 'true-ledger', 'budget-engineer'];

export const REVERSAL_PENALTY_RATE = 0.25;
export const MAX_PENALTY_PCT = 10;
export const SUPPLIER_RESTOCKING_PCT = 0.45;
export const LABOR_REALLOCATION_PCT = 0.35;
export const CONTRACTOR_OVERHEAD_PCT = 0.20;

export interface ChangeOrder {
  id: string;
  projectId: string;
  milestoneId?: string;
  title: string;
  description: string;
  status: ChangeStatus;
  reason: 'owner-request' | 'site-variation' | 'regulation' | 'error' | 'other';
  quotedCents: number;
  approvedCents?: number;
  actualCostCents?: number;
  reversalPenaltyPct: number;
  currency: string;
  proposedAt: string;
  decidedAt?: string;
  appliedAt?: string;
  wbsCode?: string;
  timelineDeltaDays?: number;
}

export interface VariationVault {
  projectId: string;
  totalBudgetCents: number;
  contingencyCents: number;
  changes: ChangeOrder[];
  reversalThresholdDays: number;
  reversalPenaltyPct: number;
}

export interface VariationImpact {
  changeOrderId: string | null;
  declaredImpactCents: number;
  recommendedCents: number;
  penalties: VariationPenalty[];
  reversalWarning: string | null;
  spreadCents: number;
}

export interface VariationPenalty {
  id: string;
  projectId: string;
  changeOrderId: string | null;
  lens: LensName;
  impactCents: number;
  penaltyCents: number;
  riskFlags: string[];
  createdAt: string;
}

export interface ReversalBreakdown {
  totalCents: number;
  supplierRestockingCents: number;
  laborReallocationCents: number;
  contractorOverheadCents: number;
  notes: string[];
}

export interface VariationTotalsResult {
  totalPenaltyCents: number;
  byLens: Record<LensName, number>;
}

export interface ChangeOrderResult {
  vault: VariationVault;
  change: ChangeOrder;
  revisedBaselineCents: number;
  withinCap: boolean;
  notifications: string[];
  analysis: VariationImpact;
  breakdown: ReversalBreakdown;
  newBoqLine: { description: string; totalCents: number };
  wbsCode: string;
  timelineDeltaDays: number;
}

export function createChangeOrder(
  projectId: string,
  title: string,
  description: string,
  reason: ChangeOrder['reason'],
  quotedCents: number,
): ChangeOrder {
  return {
    id: `co-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    title,
    description,
    status: 'proposed',
    reason,
    quotedCents,
    reversalPenaltyPct: 10,
    currency: 'USD',
    proposedAt: new Date().toISOString(),
  };
}

export function analyzeVariation(input: {
  projectId: string;
  changeOrderId: string;
  title: string;
  lines: Array<{ description: string; quantity: number; unit: string; unitCostCents: number }>;
  declaredImpactCents: number;
  lensInputs: Record<LensName, number>;
  now?: string | Date;
}): VariationImpact {
  const lensValues = VARIATION_LENSES.map((l) => input.lensInputs[l] ?? 0);
  const sorted = [...lensValues].sort((a, b) => a - b);
  const recommendedCents = Math.round((sorted[1] + sorted[2]) / 2);
  const spreadCents = sorted[3] - sorted[0];

  const penalties: VariationPenalty[] = VARIATION_LENSES.map((lens) => {
    const impact = input.lensInputs[lens] ?? 0;
    const diff = Math.abs(impact - recommendedCents);
    const penalty = Math.round(diff * REVERSAL_PENALTY_RATE);
    const maxPenalty = Math.round(input.declaredImpactCents * MAX_PENALTY_PCT / 100);
    const penaltyCents = Math.min(penalty, maxPenalty);
    const riskFlags: string[] = [];
    if (penalty > maxPenalty) riskFlags.push(`Penalty capped at ${MAX_PENALTY_PCT}% of declared impact`);
    return {
      id: `vp-${input.changeOrderId}-${lens}`,
      projectId: input.projectId,
      changeOrderId: input.changeOrderId,
      lens,
      impactCents: impact,
      penaltyCents,
      riskFlags,
      createdAt: (input.now instanceof Date ? input.now : new Date(input.now ?? Date.now())).toISOString(),
    };
  });

  const hasCapped = penalties.some((p) => p.riskFlags.length > 0);
  const spreadExceedsCap = spreadCents > input.declaredImpactCents * MAX_PENALTY_PCT / 100;
  const reversalWarning = (hasCapped || spreadExceedsCap)
    ? `Penalties subject to ${MAX_PENALTY_PCT}% cap on declared impact`
    : null;

  return {
    changeOrderId: input.changeOrderId,
    declaredImpactCents: input.declaredImpactCents,
    recommendedCents,
    penalties,
    reversalWarning,
    spreadCents,
  };
}

export function computeReversalBreakdown(penaltyCents: number): ReversalBreakdown {
  if (penaltyCents <= 0) {
    return { totalCents: 0, supplierRestockingCents: 0, laborReallocationCents: 0, contractorOverheadCents: 0, notes: [] };
  }
  const supplierRestockingCents = Math.round(penaltyCents * SUPPLIER_RESTOCKING_PCT);
  const laborReallocationCents = Math.round(penaltyCents * LABOR_REALLOCATION_PCT);
  const contractorOverheadCents = Math.round(penaltyCents * CONTRACTOR_OVERHEAD_PCT);
  const totalCents = supplierRestockingCents + laborReallocationCents + contractorOverheadCents;
  return {
    totalCents,
    supplierRestockingCents,
    laborReallocationCents,
    contractorOverheadCents,
    notes: [
      `Supplier restocking: ${SUPPLIER_RESTOCKING_PCT * 100}%`,
      `Labor reallocation: ${LABOR_REALLOCATION_PCT * 100}%`,
      `Contractor overhead: ${CONTRACTOR_OVERHEAD_PCT * 100}%`,
    ],
  };
}

export function variationTotals(penalties: VariationPenalty[]): VariationTotalsResult {
  const byLens: Record<LensName, number> = {} as Record<LensName, number>;
  for (const lens of VARIATION_LENSES) {
    byLens[lens] = penalties.filter((p) => p.lens === lens).reduce((s, p) => s + p.penaltyCents, 0);
  }
  const totalPenaltyCents = penalties.reduce((s, p) => s + p.penaltyCents, 0);
  return { totalPenaltyCents, byLens };
}

export function processChangeOrder(input: {
  projectId: string;
  changeOrderId: string;
  title: string;
  lines: Array<{ description: string; quantity: number; unit: string; unitCostCents: number }>;
  declaredImpactCents: number;
  lensInputs: Record<LensName, number>;
  lockedBaselineCents: number;
  timelineDeltaDays: number;
  wbsCode?: string;
  escrowMilestoneId?: string;
  now?: string | Date;
}): ChangeOrderResult {
  const totalCents = input.lines.reduce((sum, l) => sum + l.quantity * l.unitCostCents, 0);
  const revisedBaselineCents = input.lockedBaselineCents + totalCents;
  const newBoqLine = { description: input.title, totalCents };
  const wbsCode = input.wbsCode ?? '99.00.00';

  const analysis = analyzeVariation({
    projectId: input.projectId,
    changeOrderId: input.changeOrderId,
    title: input.title,
    lines: input.lines,
    declaredImpactCents: input.declaredImpactCents,
    lensInputs: input.lensInputs,
    now: input.now,
  });

  const totalPenaltyCents = analysis.penalties.reduce((s, p) => s + p.penaltyCents, 0);
  const breakdown = computeReversalBreakdown(totalPenaltyCents);

  const newChange: ChangeOrder = {
    id: input.changeOrderId,
    projectId: input.projectId,
    title: input.title,
    description: input.lines.map((l) => l.description).join('; '),
    status: 'proposed',
    reason: 'owner-request',
    quotedCents: totalCents,
    reversalPenaltyPct: 10,
    currency: 'USD',
    proposedAt: (input.now instanceof Date ? input.now : new Date(input.now ?? Date.now())).toISOString(),
    wbsCode,
    timelineDeltaDays: input.timelineDeltaDays,
  };

  const newVault: VariationVault = {
    projectId: input.projectId,
    totalBudgetCents: revisedBaselineCents,
    contingencyCents: 0,
    changes: [newChange],
    reversalThresholdDays: 7,
    reversalPenaltyPct: 10,
  };

  const withinCap = totalCents <= input.declaredImpactCents;
  const notifications: string[] = [];
  if (!withinCap) notifications.push('WARNING: Change order exceeds declared impact cap');
  if (input.timelineDeltaDays > 0) notifications.push(`Timeline extended by ${input.timelineDeltaDays} days`);
  else if (input.timelineDeltaDays < 0) notifications.push(`Timeline compressed by ${Math.abs(input.timelineDeltaDays)} days`);
  if (input.escrowMilestoneId) notifications.push(`Escrow milestone ${input.escrowMilestoneId} created`);

  return {
    vault: newVault,
    change: newChange,
    revisedBaselineCents,
    withinCap,
    notifications,
    analysis,
    breakdown,
    newBoqLine,
    wbsCode,
    timelineDeltaDays: input.timelineDeltaDays,
  };
}

export function variationTotals_vault(vault: VariationVault): {
  totalProposed: number;
  totalApproved: number;
  totalApplied: number;
  totalRejected: number;
  totalCents: number;
  contingencyRemaining: number;
  contingencyUsedPct: number;
} {
  const proposed = vault.changes?.filter((c) => c.status === 'proposed').length ?? 0;
  const approved = vault.changes?.filter((c) => c.status === 'approved').length ?? 0;
  const applied = vault.changes?.filter((c) => c.status === 'applied').length ?? 0;
  const rejected = vault.changes?.filter((c) => c.status === 'rejected').length ?? 0;
  const totalCents = vault.changes?.filter((c) => c.status === 'approved' || c.status === 'applied').reduce((s, c) => s + (c.approvedCents ?? c.quotedCents), 0) ?? 0;
  return {
    totalProposed: proposed,
    totalApproved: approved,
    totalApplied: applied,
    totalRejected: rejected,
    totalCents,
    contingencyRemaining: Math.max(0, vault.contingencyCents - totalCents),
    contingencyUsedPct: vault.contingencyCents > 0 ? Math.round(totalCents / vault.contingencyCents * 100) : 0,
  };
}