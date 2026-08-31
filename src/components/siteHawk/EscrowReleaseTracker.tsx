import { DollarSign, Lock, Unlock, CheckCircle2 } from 'lucide-react';
import type { Milestone } from '@/domain/milestone';
import { calculateReleaseAmounts } from '@/engine/sitehawk/escrowRelease';

interface EscrowReleaseTrackerProps {
  milestones: Milestone[];
  contractValueCents: number;
  holdbackPct?: number;
  onRelease?: (milestoneId: string) => void;
}

export default function EscrowReleaseTracker({ milestones, contractValueCents, holdbackPct = 10, onRelease }: EscrowReleaseTrackerProps) {
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const amounts = calculateReleaseAmounts(milestones, contractValueCents, holdbackPct);

  const statusIcon = (m: Milestone) => {
    if (m.status === 'released') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (m.status === 'approved') return <Unlock className="h-4 w-4 text-amber-400" />;
    if (m.status === 'pending') return <Clock className="h-4 w-4 text-stone-500" />;
    return <Lock className="h-4 w-4 text-stone-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Escrow Release Tracker</h3>
        </div>
        <span className="text-xs text-stone-400">{amounts.remainingCents > 0 ? 'Active' : 'Settled'}</span>
      </div>

      {/* Summary */}
      <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-stone-500">Contract</span>
            <div className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(contractValueCents)}</div>
          </div>
          <div>
            <span className="text-stone-500">Released</span>
            <div className="text-emerald-400 font-mono tabular-nums">{fmt(amounts.releasedCents)}</div>
          </div>
          <div>
            <span className="text-stone-500">Remaining</span>
            <div className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(amounts.remainingCents)}</div>
          </div>
        </div>
        <div className="mt-2 h-2 bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${amounts.releasedPct}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-stone-500">
          <span>{amounts.releasedPct}% released</span>
          <span>{holdbackPct}% holdback applied</span>
        </div>
      </div>

      {/* Milestones */}
      <div className="space-y-1.5">
        {milestones.map((m) => {
          const releaseAmount = Math.round((m.amountCents / 100) * (100 - holdbackPct));
          const holdbackAmount = m.amountCents - releaseAmount;
          return (
            <div key={m.id} className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {statusIcon(m)}
                  <span className="text-sm font-medium text-[var(--text-primary)]">{m.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    m.status === 'released' ? 'bg-emerald-500/20 text-emerald-400' :
                      m.status === 'approved' ? 'bg-amber-500/20 text-amber-400' :
                        m.status === 'pending' ? 'bg-stone-800 text-stone-400' : 'bg-stone-800 text-stone-500'
                  }`}>{m.status}</span>
                </div>
                <span className="text-xs text-stone-300 font-mono tabular-nums">{fmt(m.amountCents)}</span>
              </div>

              <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
                <span>Planned {m.plannedDate}</span>
                {m.actualDate && <span>Actual {m.actualDate}</span>}
                <span>{m.progressPct}% complete</span>
              </div>

              {m.status === 'approved' && onRelease && (
                <button onClick={() => onRelease(m.id)}
                  className="mt-2 w-full py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-xs hover:bg-emerald-500/20 transition-colors">
                  Release {fmt(releaseAmount)} (hold {fmt(holdbackAmount)})
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-stone-500">
        Holdback: {holdbackPct}% retained per milestone until practical completion · Escrow-gated via DzeNhare trust account
      </div>
    </div>
  );
}
