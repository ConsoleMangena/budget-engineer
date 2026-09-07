import { MapPin, Users, Clock, Zap } from 'lucide-react';

interface DemandSignal {
  id: string;
  region: string;
  material: string;
  quantityUnits: number;
  deadline: string;
  projectCount?: number;
  contractorName?: string;
  reliabilityPct?: number;
}

interface DemandRadarProps {
  signals: DemandSignal[];
  aggregated?: { region: string; material: string; totalUnits: number; projectCount: number; deadline: string }[];
  onSelect?: (signal: DemandSignal) => void;
}

export default function DemandRadar({ signals, aggregated, onSelect }: DemandRadarProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-amber-400" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Demand Radar</h3>
        <span className="text-xs text-stone-400">Live signals from {signals.length} projects</span>
      </div>

      {aggregated && aggregated.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Aggregated Demand</h4>
          {aggregated.map((a, i) => (
            <div key={`${a.region}-${a.material}-${i}`} className="p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-primary)]">{a.material}</span>
                <span className="text-xs text-stone-400">{a.totalUnits} units across {a.projectCount} projects</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                <MapPin className="h-3 w-3" />{a.region}
                <Clock className="h-3 w-3 ml-2" />Deadline {a.deadline}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Individual Signals</h4>
        {signals.map((s) => (
          <button key={s.id} onClick={() => onSelect?.(s)}
            className="w-full p-2.5 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg text-left hover:border-amber-500/50 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-primary)]">{s.material}</span>
              <span className="text-xs text-stone-400 tabular-nums">{s.quantityUnits} units</span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{s.region}</span>
              {s.projectCount && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.projectCount} projects</span>}
              {s.reliabilityPct && <span>{s.reliabilityPct}% reliability</span>}
            </div>
          </button>
        ))}
      </div>

      {signals.length === 0 && (
        <div className="text-center py-6 text-stone-500 text-sm">
          No demand signals detected. Add projects to activate the radar.
        </div>
      )}
    </div>
  );
}
