import { FileText, Lock, Unlock } from 'lucide-react';
import type { CostBaseline } from '@/engine/greenflag/costBaseline';
import { budgetAtAGlance } from '@/engine/greenflag/costBaseline';

interface CostBaselineDocumentProps {
  baseline: CostBaseline;
  spentCents: number;
  onLock?: () => void;
}

export default function CostBaselineDocument({ baseline, spentCents, onLock }: CostBaselineDocumentProps) {
  const glance = budgetAtAGlance(baseline, spentCents);
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const statusColor = glance.status === 'on-track' ? 'text-emerald-400' : glance.status === 'caution' ? 'text-amber-400' : 'text-red-400';
  const statusBg = glance.status === 'on-track' ? 'bg-emerald-500/10' : glance.status === 'caution' ? 'bg-amber-500/10' : 'bg-red-500/10';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cost Baseline</h3>
        </div>
        <div className="flex items-center gap-2">
          {baseline.locked ? (
            <span className="flex items-center gap-1 text-xs text-amber-400"><Lock className="h-3 w-3" />Locked until {baseline.lockedUntil?.split('T')[0]}</span>
          ) : (
            <button onClick={onLock} className="flex items-center gap-1 text-xs text-stone-400 hover:text-[var(--brand-accent)]"><Unlock className="h-3 w-3" />Lock</button>
          )}
        </div>
      </div>

      <div className={`p-3 rounded-lg border ${statusBg} border-stone-700`}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">Status</span>
          <span className={`text-xs font-medium capitalize ${statusColor}`}>{glance.status}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-stone-400">Budget Used</span>
          <span className="text-xs text-[var(--text-primary)] tabular-nums">{glance.spentPct}%</span>
        </div>
        <div className="mt-2 h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${glance.status === 'on-track' ? 'bg-emerald-500' : glance.status === 'caution' ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(100, glance.spentPct)}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Total Budget</span>
          <div className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(glance.totalBudgetCents)}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Spent</span>
          <div className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(glance.spentCents)}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Remaining</span>
          <div className={`font-mono tabular-nums ${glance.remainingCents >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{fmt(glance.remainingCents)}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Contingency</span>
          <div className="text-[var(--brand-accent)] font-mono tabular-nums">{fmt(glance.contingencyCents)}</div>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-stone-400">Line Items</div>
        {baseline.items.map((item) => (
          <div key={item.wbsCode} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
            <div className="flex items-center gap-2">
              <span className="text-stone-500 font-mono">{item.wbsCode}</span>
              <span className="text-[var(--text-primary)]">{item.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                item.deliveryStatus === 'delivered' || item.deliveryStatus === 'installed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-400'
              }`}>{item.deliveryStatus}</span>
              <span className="text-stone-300 font-mono tabular-nums">{fmt(item.totalCostCents)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs text-stone-500">
        Version {baseline.version} · {baseline.currency} · Created {baseline.createdAt.split('T')[0]}
      </div>
    </div>
  );
}
