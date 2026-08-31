import { Truck, Clock, AlertTriangle, CheckCircle2, Package } from 'lucide-react';
import type { DeliveryRecord, SiteResource } from '@/engine/sitehawk/siteMobilization';
import { trackDeliveryStatus, siteReadinessChecklist } from '@/engine/sitehawk/siteMobilization';

interface SiteMobilizationBoardProps {
  resources: SiteResource[];
  deliveries: DeliveryRecord[];
  onSelectDelivery?: (delivery: DeliveryRecord) => void;
}

export default function SiteMobilizationBoard({ resources, deliveries, onSelectDelivery }: SiteMobilizationBoardProps) {
  const status = trackDeliveryStatus(deliveries);
  const checklist = siteReadinessChecklist(resources, deliveries);
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  const statusPill = (s: DeliveryRecord['status']) => {
    const map: Record<string, string> = {
      pending: 'bg-stone-800 text-stone-400',
      'in-transit': 'bg-blue-500/20 text-blue-400',
      arrived: 'bg-amber-500/20 text-amber-400',
      verified: 'bg-emerald-500/20 text-emerald-400',
      rejected: 'bg-red-500/20 text-red-400',
    };
    return map[s] ?? 'bg-stone-800 text-stone-500';
  };

  const resourceStatusIcon = (s: SiteResource['status']) => {
    if (s === 'on-site') return <CheckCircle2 className="h-3 w-3 text-emerald-400" />;
    if (s === 'in-transit') return <Truck className="h-3 w-3 text-blue-400" />;
    if (s === 'maintenance') return <AlertTriangle className="h-3 w-3 text-amber-400" />;
    return <span className="h-3 w-3 block rounded-full bg-stone-600" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Truck className="h-5 w-5 text-[var(--brand-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Site Mobilization</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Pending</div>
          <div className="text-[var(--text-primary)] font-mono tabular-nums">{status.pending}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">In Transit</div>
          <div className="text-blue-400 font-mono tabular-nums">{status.inTransit}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Verified</div>
          <div className="text-emerald-400 font-mono tabular-nums">{status.verified}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Overdue</div>
          <div className={`font-mono tabular-nums ${status.overdue > 0 ? 'text-red-400' : 'text-stone-400'}`}>{status.overdue}</div>
        </div>
      </div>

      {/* Readiness checklist */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Readiness Checklist</h4>
        {checklist.map((item) => (
          <div key={item.item} className="flex items-center gap-2 text-xs p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded">
            {item.status === 'done' ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              : item.status === 'warning' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                : <span className="h-3.5 w-3.5 block rounded-full border border-stone-600 shrink-0" />}
            <span className="text-[var(--text-primary)] flex-1">{item.item}</span>
            <span className="text-stone-500">{item.detail}</span>
          </div>
        ))}
      </div>

      {/* Deliveries */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Deliveries</h4>
        {deliveries.map((d) => (
          <button key={d.id} onClick={() => onSelectDelivery?.(d)}
            className="w-full p-2.5 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg text-left hover:border-[var(--brand-accent)] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-stone-400" />
                <span className="text-sm text-[var(--text-primary)]">{d.material}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusPill(d.status)}`}>{d.status}</span>
              </div>
              <span className="text-xs text-stone-300 font-mono tabular-nums">{fmt(d.costCents)}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
              <span>{d.supplierName}</span>
              <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{d.expectedDate}</span>
              <span>{d.quantity} {d.unit}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Resources */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Equipment</h4>
        <div className="grid grid-cols-2 gap-1.5">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-2 p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
              {resourceStatusIcon(r.status)}
              <span className="text-[var(--text-primary)] truncate">{r.label}</span>
              <span className="text-stone-500 ml-auto">{r.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
