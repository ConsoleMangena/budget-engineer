import { Lightbulb, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { ValueEngineeringSuggestion, CashflowForecast } from '@/engine/greenflag/costBaseline';
import { generateCashflowForecast, valueEngineSuggestions } from '@/engine/greenflag/costBaseline';
import type { CostBaseline } from '@/engine/greenflag/costBaseline';

interface ValueEngineeringModuleProps {
  baseline: CostBaseline;
  onApply?: (suggestion: ValueEngineeringSuggestion) => void;
}

export default function ValueEngineeringModule({ baseline, onApply }: ValueEngineeringModuleProps) {
  const suggestions = valueEngineSuggestions(baseline);
  const forecast = generateCashflowForecast(baseline);
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-[var(--brand-accent)]" />
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Value Engineering</h3>
        <span className="text-xs text-stone-400">{suggestions.length} suggestions</span>
      </div>

      {suggestions.length === 0 && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />No savings opportunities identified — baseline is optimized
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div key={`${s.wbsCode}-${i}`} className="p-3 bg-[var(--bg-secondary)] border border-stone-700 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-stone-500 font-mono text-xs">{s.wbsCode}</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{s.description}</span>
              </div>
              <span className="text-xs text-emerald-400 font-mono tabular-nums">-{fmt(s.savingsCents)}</span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1">{s.reason}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-stone-500">Risk: {s.riskLevel}</span>
              {onApply && (
                <button onClick={() => onApply(s)} className="text-[10px] text-[var(--brand-accent)] hover:underline flex items-center gap-1">
                  Apply<ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {forecast.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wide">Cashflow Forecast</h4>
          {forecast.map((f, i) => (
            <div key={`${f.date}-${i}`} className="flex items-center justify-between p-2 bg-[var(--bg-secondary)] border border-stone-700 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className="text-stone-400">{f.date}</span>
                <span className="text-[var(--text-primary)]">{f.milestoneName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-stone-400 tabular-nums">{f.plannedPct}%</span>
                <span className="text-[var(--text-primary)] font-mono tabular-nums">{fmt(f.plannedAmountCents)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
