import { useMemo } from 'react';
import { BarChart3, Award, Truck } from 'lucide-react';
import type { TcoQuote, TcoResult } from '@/engine/greenflag/bulkProcurement';
import { calculateTco } from '@/engine/greenflag/bulkProcurement';

interface ValueDrivenQuotingToolProps {
  quotes: TcoQuote[];
  baseUnitCostCents: number;
  materialName: string;
  onSelect?: (quote: TcoQuote) => void;
}

export default function ValueDrivenQuotingTool({ quotes, baseUnitCostCents, materialName, onSelect }: ValueDrivenQuotingToolProps) {
  const results = useMemo(() => calculateTco(quotes, baseUnitCostCents), [quotes, baseUnitCostCents]);
  const bestResult = results[0];

  const fmt = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[var(--brand-accent)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Value-Driven Quoting</h3>
        </div>
        <span className="text-xs text-stone-400">{materialName}</span>
      </div>

      <div className="space-y-2">
        {results.map((r) => {
          const isBest = r.rank === 1;
          return (
            <button key={r.quote.id} onClick={() => onSelect?.(r.quote)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${isBest ? 'border-emerald-500 bg-emerald-500/5' : 'border-stone-700'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBest && <Award className="h-4 w-4 text-emerald-400" />}
                  <span className="text-sm font-medium text-[var(--text-primary)]">{r.quote.supplierName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-800 text-stone-400">#{r.rank}</span>
                </div>
                <span className={`text-sm font-mono tabular-nums ${isBest ? 'text-emerald-400' : 'text-[var(--text-primary)]'}`}>{fmt(r.totalTcoCents)}</span>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
                <div>
                  <span className="text-stone-500">Base</span>
                  <span className="ml-1 text-stone-300 tabular-nums">{fmt(r.basePriceCents)}</span>
                </div>
                <div>
                  <span className="text-stone-500">Reliability</span>
                  <span className={`ml-1 tabular-nums ${r.reliabilityBonusCents <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {r.reliabilityBonusCents <= 0 ? `-${fmt(Math.abs(r.reliabilityBonusCents))}` : `+${fmt(r.reliabilityBonusCents)}`}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Defects</span>
                  <span className={`ml-1 tabular-nums ${r.defectPenaltyCents > 0 ? 'text-red-400' : 'text-stone-300'}`}>
                    {r.defectPenaltyCents > 0 ? `+${fmt(r.defectPenaltyCents)}` : '$0'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500">Delay</span>
                  <span className={`ml-1 tabular-nums ${r.delayCostCents > 0 ? 'text-amber-400' : 'text-stone-300'}`}>
                    {r.delayCostCents > 0 ? `+${fmt(r.delayCostCents)}` : '$0'}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-3 text-[10px] text-stone-500">
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{r.quote.leadTimeDays}d lead</span>
                <span>{r.quote.onTimeDeliveryPct}% on-time</span>
                <span>{r.quote.defectRatePct}% defects</span>
                <span>{r.quote.quantity} units</span>
              </div>
            </button>
          );
        })}
      </div>

      {bestResult && (
        <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-400">
          Best value: {bestResult.quote.supplierName} — Total Cost of Ownership {fmt(bestResult.totalTcoCents)} (rank #{bestResult.rank})
        </div>
      )}
    </div>
  );
}
