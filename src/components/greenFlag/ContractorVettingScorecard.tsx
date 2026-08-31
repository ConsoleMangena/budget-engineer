import { Shield, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { buildVettingScorecard, isEligibleForAssignments, volumeRebateTier } from '@/engine/greenflag/certification';

interface ContractorVettingScorecardProps {
  resourceId: string;
  resourceName: string;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  reliabilityScore: number;
  wipaaHealthPct: number;
  totalProjects: number;
  rating: number;
  verifiedBadge: boolean;
  creditScore: number;
  type: string;
  totalSpendCents?: number;
}

export default function ContractorVettingScorecard({
  resourceName, onTimeDeliveryPct, defectRatePct, reliabilityScore,
  wipaaHealthPct, totalProjects, rating, verifiedBadge, creditScore,
  type, totalSpendCents,
}: ContractorVettingScorecardProps) {
  const scorecard = buildVettingScorecard({
    id: '', name: resourceName, role: type, rating, onTimeDeliveryPct,
    defectRatePct, reliabilityScore, wipaaHealthPct, totalProjects,
    verifiedBadge, creditScore, type: type as 'architect',
    locationLabel: '', specialization: [], servicesOffered: [],
  });
  const eligible = isEligibleForAssignments(scorecard);
  const rebate = totalSpendCents ? volumeRebateTier(totalSpendCents) : null;

  const tierColor = scorecard.tier === 'platinum' ? 'text-cyan-400' : scorecard.tier === 'gold' ? 'text-[var(--brand-accent)]' : scorecard.tier === 'silver' ? 'text-stone-300' : 'text-stone-500';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Vetting Scorecard</h3>
        </div>
        <div className="flex items-center gap-1">
          <Award className={`h-4 w-4 ${tierColor}`} />
          <span className={`text-xs font-medium capitalize ${tierColor}`}>{scorecard.tier}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] rounded border border-stone-700">
          <span className="text-stone-500">On-time Delivery</span>
          <span className="ml-1 text-[var(--text-primary)] tabular-nums">{onTimeDeliveryPct}%</span>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] rounded border border-stone-700">
          <span className="text-stone-500">Defect Rate</span>
          <span className="ml-1 text-[var(--text-primary)] tabular-nums">{defectRatePct}%</span>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] rounded border border-stone-700">
          <span className="text-stone-500">WIPAA Health</span>
          <span className="ml-1 tabular-nums" style={{ color: wipaaHealthPct >= 85 ? '#10b981' : '#f59e0b' }}>{wipaaHealthPct}%</span>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] rounded border border-stone-700">
          <span className="text-stone-500">Projects</span>
          <span className="ml-1 text-[var(--text-primary)] tabular-nums">{totalProjects}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {scorecard.checks.map((check) => (
          <div key={check.checkType} className="flex items-center gap-2 text-xs">
            {check.passed
              ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            }
            <span className={check.passed ? 'text-[var(--text-primary)]' : 'text-red-400'}>{check.details}</span>
          </div>
        ))}
      </div>

      <div className={`flex items-center gap-2 text-xs p-2 rounded-lg ${eligible ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
        {eligible ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {eligible ? 'Eligible for assignments' : 'Not eligible — missing certifications'}
      </div>

      {rebate && rebate.combinedPct > 0 && (
        <div className="p-2 bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/30 rounded-lg text-xs text-[var(--brand-accent)]">
          Volume Rebate: {rebate.dzenharePct}% DzeNhare + {rebate.supplierPct}% Supplier = {rebate.combinedPct}% combined savings
        </div>
      )}
    </div>
  );
}
