import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, Scale, ClipboardCheck } from 'lucide-react';
import type { WipSnapshot, SolvencyCheck, HandoverItem } from '@/engine/sitehawk/wipaaMonitor';
import { calculateWipaaFromSnapshot, runSolvencyCheck, buildHandoverChecklist, handoverProgress } from '@/engine/sitehawk/wipaaMonitor';

interface WipaaMonitorPanelProps {
  snapshots: WipSnapshot[];
  contractedOutstandingCents: number;
  onRunCheck?: () => void;
  onCompleteChecklist?: (itemId: string) => void;
}

export default function WipaaMonitorPanel({ snapshots, contractedOutstandingCents, onRunCheck, onCompleteChecklist }: WipaaMonitorPanelProps) {
  const latest = snapshots[snapshots.length - 1];
  const solvency = latest ? runSolvencyCheck(latest.projectId, latest, contractedOutstandingCents) : null;
  const checklist = buildHandoverChecklist();
  const progress = handoverProgress(checklist);
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  if (!latest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">WIPAA Monitor</h3>
        </div>
        <div className="text-center py-6 text-stone-500 text-sm">No WIPAA snapshots yet. Run a check to get started.</div>
        {onRunCheck && (
          <button onClick={onRunCheck} className="w-full py-2 bg-[var(--brand-accent)] text-black rounded-lg font-medium text-sm">Run WIPAA Check</button>
        )}
      </div>
    );
  }

  const wip = calculateWipaaFromSnapshot(latest);

  const alertColor = (level: string) => {
    if (level === 'green') return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
    if (level === 'amber') return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    return 'bg-red-500/10 border-red-500/30 text-red-400';
  };

  const billingPill = (status: string) => {
    if (status === 'on-track') return 'bg-emerald-500/20 text-emerald-400';
    if (status === 'under-billed') return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">WIPAA Monitor</h3>
        </div>
        {onRunCheck && (
          <button onClick={onRunCheck} className="text-xs text-stone-400 hover:text-[var(--brand-accent)] flex items-center gap-1">
            <Clock className="h-3 w-3" />Run Now
          </button>
        )}
      </div>

      {/* WIP Snapshot */}
      <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-400">WIPAA Snapshot — {latest.monthKey}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${billingPill(wip.billingStatus)}`}>{wip.billingStatus}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-stone-500">Cost %</span>
            <div className="text-[var(--text-primary)] font-mono tabular-nums">{(wip.costPctComplete * 100).toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-stone-500">Revenue</span>
            <div className="text-emerald-400 font-mono tabular-nums">{fmt(wip.revenueEarnedCents)}</div>
          </div>
          <div>
            <span className="text-stone-500">Over/Under</span>
            <div className={`font-mono tabular-nums ${wip.overUnderBilledCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {wip.overUnderBilledCents >= 0 ? '+' : ''}{fmt(wip.overUnderBilledCents)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-stone-500">
          <span>Contract {fmt(latest.contractValueCents)}</span>
          <span>Billed {fmt(latest.billedToDateCents)}</span>
          <span>Costs {fmt(latest.costsIncurredCents)}</span>
        </div>
      </div>

      {/* Solvency Alert */}
      {solvency && (
        <div className={`p-3 rounded-lg border ${alertColor(solvency.alertLevel)}`}>
          <div className="flex items-center gap-2 text-xs font-medium">
            {solvency.alertLevel === 'green' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {solvency.alertReason}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
            <span>Projected profit {fmt(solvency.projectedProfitCents)}</span>
            <span>{(solvency.projectedProfitPct).toFixed(1)}% margin</span>
          </div>
        </div>
      )}

      {/* Snapshot History */}
      {snapshots.length > 1 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">History</h4>
          {snapshots.slice().reverse().map((s) => {
            const w = calculateWipaaFromSnapshot(s);
            return (
              <div key={s.id} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 tabular-nums">{s.monthKey}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${billingPill(w.billingStatus)}`}>{w.billingStatus}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-stone-500 tabular-nums">{(w.costPctComplete * 100).toFixed(0)}% cost</span>
                  <span className={`font-mono tabular-nums ${w.overUnderBilledCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {w.overUnderBilledCents >= 0 ? '+' : ''}{fmt(w.overUnderBilledCents)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Handover Checklist */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Handover Checklist ({progress.completedItems}/{progress.totalItems})
        </h4>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-[var(--brand-accent)] rounded-full" style={{ width: `${progress.overallPct}%` }} />
        </div>
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs p-1.5 bg-[var(--bg-secondary)] border border-stone-700 rounded">
            <button onClick={() => onCompleteChecklist?.(item.id)}
              className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-stone-600'
              }`}>
              {item.checked && <CheckCircle2 className="h-3 w-3 text-white" />}
            </button>
            <span className="text-stone-500 uppercase text-[10px] w-16">{item.category}</span>
            <span className={item.checked ? 'text-stone-500 line-through' : 'text-[var(--text-primary)]'}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
