import { Camera, CheckCircle2, XCircle } from 'lucide-react';
import type { ProgressEntry, VerificationGate, ZoneProgress } from '@/engine/sitehawk/digitalTwin';
import { trackProgress, checkVerificationGates, photoQualityCheck } from '@/engine/sitehawk/digitalTwin';

interface DigitalTwinPanelProps {
  entries: ProgressEntry[];
  gates: VerificationGate[];
  onApproveGate?: (gateId: string) => void;
}

export default function DigitalTwinPanel({ entries, gates, onApproveGate }: DigitalTwinPanelProps) {
  const progress = trackProgress(entries);
  const gateResult = checkVerificationGates(gates);
  const allPhotos = entries.flatMap((e) => e.photoCheckpoints);
  const photoQuality = photoQualityCheck(allPhotos);

  const deviationColor = (d: number) => d >= 0 ? 'text-emerald-400' : d > -10 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-[var(--brand-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Digital Twin Verification</h3>
      </div>

      {/* Overall Progress */}
      <div className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-stone-400">Overall Progress</span>
          <span className="text-[var(--text-primary)] tabular-nums">{progress.overallActualPct}% / {progress.overallPlannedPct}% planned</span>
        </div>
        <div className="h-2 bg-stone-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-[var(--brand-accent)]/40" style={{ width: `${progress.overallPlannedPct}%` }} />
          <div className={`h-full ${progress.overallDeviationPct >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${progress.overallActualPct}%`, marginLeft: `-${progress.overallActualPct}%`, position: 'relative', left: `${progress.overallPlannedPct}%` }} />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className={deviationColor(progress.overallDeviationPct)}>
            {progress.overallDeviationPct >= 0 ? '+' : ''}{progress.overallDeviationPct}% deviation
          </span>
          <span className="text-stone-500">{progress.totalPhotos} photos · {progress.approvedPhotos} approved</span>
        </div>
      </div>

      {/* Zone breakdown */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Zones</h4>
        {progress.zones.map((zone) => (
          <div key={zone.zone} className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-primary)]">{zone.zone}</span>
              <span className={`tabular-nums ${deviationColor(zone.deviationPct)}`}>
                {zone.deviationPct >= 0 ? '+' : ''}{zone.deviationPct}%
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-[10px] text-stone-500">
              <span>Planned {zone.totalPlannedPct}%</span>
              <span>Actual {zone.totalActualPct}%</span>
              <span>{zone.photoCount} photos</span>
            </div>
          </div>
        ))}
      </div>

      {/* Verification Gates */}
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">
          Verification Gates ({gateResult.passed}/{gateResult.total})
        </h4>
        {gates.map((gate) => (
          <div key={gate.id} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
            <div className="flex items-center gap-2">
              {gate.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                : <XCircle className="h-3.5 w-3.5 text-stone-500" />}
              <span className="text-[var(--text-primary)] capitalize">{gate.gateType} gate</span>
              {gate.required && !gate.passed && <span className="text-[9px] px-1 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>}
            </div>
            {!gate.passed && onApproveGate && (
              <button onClick={() => onApproveGate(gate.id)} className="text-[10px] text-[var(--brand-accent)] hover:underline">Approve</button>
            )}
          </div>
        ))}
      </div>

      {/* Photo quality */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Approved</div>
          <div className="text-emerald-400 font-mono">{photoQuality.approved.length}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Pending</div>
          <div className="text-amber-400 font-mono">{photoQuality.pending.length}</div>
        </div>
        <div className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-center">
          <div className="text-stone-500">Geo-tagged</div>
          <div className="text-[var(--text-primary)] font-mono">{photoQuality.geoTaggedPct}%</div>
        </div>
      </div>
    </div>
  );
}
