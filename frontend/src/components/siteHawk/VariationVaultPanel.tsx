import { AlertTriangle } from 'lucide-react';
import type { ChangeOrder, VariationVault } from '@/engine/sitehawk/variationVault';
import { changeOrderSummary, reversalPenalty } from '@/engine/sitehawk/variationVault';

interface VariationVaultPanelProps {
  vault: VariationVault;
  onApprove?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
}

export default function VariationVaultPanel({ vault, onApprove, onReject }: VariationVaultPanelProps) {
  const summary = changeOrderSummary(vault);
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const statusPill = (s: ChangeOrder['status']) => {
    const map: Record<string, string> = {
      proposed: 'bg-blue-500/20 text-blue-400',
      quoted: 'bg-amber-500/20 text-amber-400',
      approved: 'bg-emerald-500/20 text-emerald-400',
      applied: 'bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]',
      rejected: 'bg-red-500/20 text-red-400',
      disputed: 'bg-orange-500/20 text-orange-400',
    };
    return map[s] ?? 'bg-stone-800 text-stone-500';
  };

  const reasonLabel = (r: ChangeOrder['reason']) => {
    const map: Record<string, string> = {
      'owner-request': 'Owner request',
      'site-variation': 'Site variation',
      'regulation': 'Regulation',
      'error': 'Error',
      'other': 'Other',
    };
    return map[r] ?? r;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--brand-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Variation Vault</h3>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Proposed</div>
          <div className="text-blue-400 font-mono tabular-nums">{summary.totalProposed}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Approved</div>
          <div className="text-emerald-400 font-mono tabular-nums">{summary.totalApproved}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Contingency</div>
          <div className={`font-mono tabular-nums ${summary.contingencyRemaining > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmt(summary.contingencyRemaining)}
          </div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Used %</div>
          <div className={`font-mono tabular-nums ${summary.contingencyUsedPct <= 50 ? 'text-emerald-400' : summary.contingencyUsedPct <= 80 ? 'text-amber-400' : 'text-red-400'}`}>
            {summary.contingencyUsedPct}%
          </div>
        </div>
      </div>

      {/* Contingency bar */}
      <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-stone-400">Contingency Usage</span>
          <span className="text-[var(--text-primary)] tabular-nums">{fmt(summary.totalCents)} of {fmt(vault.contingencyCents)}</span>
        </div>
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${
            summary.contingencyUsedPct <= 50 ? 'bg-emerald-500' : summary.contingencyUsedPct <= 80 ? 'bg-amber-500' : 'bg-red-500'
          }`} style={{ width: `${Math.min(100, summary.contingencyUsedPct)}%` }} />
        </div>
      </div>

      {/* Change orders */}
      <div className="space-y-2">
        {vault.changes.map((co) => {
          const daysSinceApproval = co.decidedAt ? Math.round((Date.now() - new Date(co.decidedAt).getTime()) / 86_400_000) : 0;
          const penalty = reversalPenalty(co, daysSinceApproval);
          return (
            <div key={co.id} className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusPill(co.status)}`}>{co.status}</span>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{co.title}</span>
                </div>
                <span className="text-xs font-mono tabular-nums text-stone-300">{fmt(co.approvedCents ?? co.quotedCents)}</span>
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-stone-500">
                <span>{reasonLabel(co.reason)}</span>
                <span>Quoted {fmt(co.quotedCents)}</span>
                {co.approvedCents && <span>Approved {fmt(co.approvedCents)}</span>}
              </div>

              {penalty.penaltyCents > 0 && (
                <div className="mt-2 p-1.5 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-400">
                  Reversal penalty: {fmt(penalty.penaltyCents)} ({penalty.penaltyPct}%) after 7-day window · {daysSinceApproval}d since approval
                </div>
              )}

              {co.status === 'proposed' && (
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onApprove?.(co.id)}
                    className="flex-1 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs hover:bg-emerald-500/20">
                    Approve
                  </button>
                  <button onClick={() => onReject?.(co.id)}
                    className="flex-1 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/20">
                    Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-stone-500">
        Contingency retained from BOQ · Reversal penalties apply after 7-day window · All changes tracked in True Ledger
      </div>
    </div>
  );
}
