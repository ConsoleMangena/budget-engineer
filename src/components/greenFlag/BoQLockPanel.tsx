import { Lock, Unlock } from 'lucide-react';
import type { BoqSnapshot, P4pEnvelope } from '@/engine/greenflag/costBaseline';

interface BoQLockPanelProps {
  snapshot: BoqSnapshot;
  envelope: P4pEnvelope;
  onLock?: () => void;
  onExport?: () => void;
}

export default function BoQLockPanel({ snapshot, envelope, onLock }: BoQLockPanelProps) {
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const utilizationPct = envelope.utilizationPct ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {snapshot.locked ? <Lock className="h-4 w-4 text-amber-400" /> : <Unlock className="h-4 w-4 text-stone-400" />}
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">BOQ Lock</h4>
        </div>
        {!snapshot.locked && (
          <button onClick={onLock} className="text-xs text-stone-400 hover:text-[var(--brand-accent)] flex items-center gap-1">
            <Lock className="h-3 w-3" />Lock BOQ
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Items</span>
          <div className="text-[var(--text-primary)] font-mono tabular-nums">{snapshot.lineItems.length}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Total</span>
          <div className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(snapshot.totalCents)}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
          <span className="text-stone-500">Locked</span>
          <div className="text-amber-400 font-mono tabular-nums">{snapshot.lockedAt?.split('T')[0] ?? 'N/A'}</div>
        </div>
      </div>

      <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-stone-400">P4P Envelope Utilization</span>
          <span className="text-[var(--text-primary)] tabular-nums">{utilizationPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-[var(--brand-accent)] transition-all" style={{ width: `${Math.min(100, utilizationPct)}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-stone-500">
          <span>{fmt(envelope.paidCents)} paid</span>
          <span>{fmt(envelope.pendingCents)} pending</span>
          <span>{fmt(envelope.totalCents)} total</span>
        </div>
      </div>

      <div className="space-y-1">
        {snapshot.lineItems.slice(0, 6).map((item) => (
          <div key={item.code} className="flex items-center justify-between text-xs p-1.5">
            <div className="flex items-center gap-2">
              <span className="text-stone-500 font-mono">{item.code}</span>
              <span className="text-[var(--text-primary)] truncate">{item.description}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-1 py-0.5 rounded text-[10px] ${
                item.deliveryStatus === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800 text-stone-500'
              }`}>{item.deliveryStatus}</span>
              <span className="text-stone-300 font-mono tabular-nums">{fmt(item.totalCostCents)}</span>
            </div>
          </div>
        ))}
        {snapshot.lineItems.length > 6 && (
          <div className="text-[10px] text-stone-500 text-center pt-1">+{snapshot.lineItems.length - 6} more items</div>
        )}
      </div>

      {snapshot.locked && (
        <div className="text-[10px] text-stone-500">
          BOQ locked at snapshot version {snapshot.locked ? '1' : '0'} — changes require unlock
        </div>
      )}
    </div>
  );
}
