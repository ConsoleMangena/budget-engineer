/**
 * Escrow Release engine — milestone-based release calculations.
 * Used by EscrowReleaseTracker component.
 */

export interface ReleaseAmounts {
  releasedCents: number;
  remainingCents: number;
  releasedPct: number;
}

/**
 * Calculate release amounts for a list of milestones.
 * Applies holdback percentage to each milestone's planned cost.
 */
export function calculateReleaseAmounts(
  milestones: Array<{ amountCents?: number; plannedCostCents: number }>,
  contractValueCents: number,
  holdbackPct: number = 10
): ReleaseAmounts {
  const totalPlanned = milestones.reduce((sum, m) => sum + (m.amountCents ?? m.plannedCostCents), 0);
  const holdbackFactor = (100 - holdbackPct) / 100;
  const releasedCents = Math.round(totalPlanned * holdbackFactor);
  const remainingCents = contractValueCents - releasedCents;
  const releasedPct = contractValueCents > 0 ? Math.round((releasedCents / contractValueCents) * 100) : 0;

  return {
    releasedCents,
    remainingCents: Math.max(0, remainingCents),
    releasedPct: Math.min(100, Math.max(0, releasedPct)),
  };
}

// Re-export Milestone type for convenience
export type { Milestone } from '@/domain/milestone';