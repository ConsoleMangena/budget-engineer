import { useState, useMemo } from 'react'
import {
  Building2,
  Ruler,
  HardHat,
} from 'lucide-react'
import {
  OCCUPANCY_MATRIX,
  OCCUPANCY_CLASSES,
  classifyOccupancy,
  type OccupancyClass,
} from '@/engine/compliance/occupancyMatrix'
import { listSpecStandards } from '@/engine/standards/roomStandards'
import type { DetailCategory } from '@/engine/construction/constructionDetails'
import {
  DETAIL_CATEGORIES,
  getDetailsByCategory,
  getDetailById,
} from '@/engine/construction/constructionDetails'

/* ──────────────────────────────────────────────────────────────── */
/*  Types                                                           */
/* ──────────────────────────────────────────────────────────────── */

type BrowserTab = 'occupancy' | 'room-standards' | 'construction'

/* ──────────────────────────────────────────────────────────────── */
/*  Helpers                                                         */
/* ──────────────────────────────────────────────────────────────── */

const ZONE_COLORS: Record<string, string> = {
  public: '#3b82f6',
  private: '#22c55e',
  service: '#f59e0b',
  circulation: '#8b5cf6',
}

function occBadgeClass(code: OccupancyClass): string {
  if (code.startsWith('B')) return 'bg-blue-900/30 text-blue-400'
  if (code.startsWith('A')) return 'bg-amber-900/30 text-amber-400'
  if (code.startsWith('F')) return 'bg-emerald-900/30 text-emerald-400'
  if (code.startsWith('E')) return 'bg-cyan-900/30 text-cyan-400'
  if (code.startsWith('G')) return 'bg-purple-900/30 text-purple-400'
  if (code.startsWith('H')) return 'bg-rose-900/30 text-rose-400'
  if (code.startsWith('J')) return 'bg-red-900/30 text-red-400'
  return 'bg-slate-800 text-slate-300'
}

/* ──────────────────────────────────────────────────────────────── */
/*  Component                                                       */
/* ──────────────────────────────────────────────────────────────── */

export function ConstructionDetailsBrowser({
  buildingType,
}: {
  buildingType?: string
}) {
  const [activeTab, setActiveTab] = useState<BrowserTab>('occupancy')

  /* Occupancy tab */
  const [occFilter, setOccFilter] = useState('')
  const classifiedBuilding = useMemo(
    () => (buildingType ? classifyOccupancy(buildingType) : null),
    [buildingType],
  )

  const filteredOccupancies = useMemo(() => {
    const q = occFilter.toLowerCase()
    return OCCUPANCY_CLASSES.filter((code) => {
      const spec = OCCUPANCY_MATRIX[code]
      if (!q) return true
      return (
        spec.code.toLowerCase().includes(q) ||
        spec.label.toLowerCase().includes(q) ||
        spec.description.toLowerCase().includes(q)
      )
    })
  }, [occFilter])

  /* Room standards tab */
  const specStandards = useMemo(() => listSpecStandards(), [])
  const [roomFilter, setRoomFilter] = useState('')

  const filteredStandards = useMemo(() => {
    const q = roomFilter.toLowerCase()
    return specStandards.filter((rs) => {
      if (!q) return true
      return (
        rs.name.toLowerCase().includes(q) ||
        rs.zone.toLowerCase().includes(q)
      )
    })
  }, [specStandards, roomFilter])

  /* Construction details tab */
  const [detailCategory, setDetailCategory] = useState<DetailCategory>('wall-sections')
  const [selectedDetailId, setSelectedDetailId] = useState<string>('')

  const categoryDetails = useMemo(
    () => getDetailsByCategory(detailCategory),
    [detailCategory],
  )

  const selectedDetail = useMemo(
    () => (selectedDetailId ? getDetailById(selectedDetailId) : undefined),
    [selectedDetailId],
  )

  const selectDetailCategory = (cat: DetailCategory) => {
    setDetailCategory(cat)
    const first = getDetailsByCategory(cat)[0]
    if (first) setSelectedDetailId(first.id)
    else setSelectedDetailId('')
  }

  return (
    <div
      className="flex flex-col gap-3"
      data-component="construction-details-browser"
    >
      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-slate-900/80 p-1">
        {([
          { key: 'occupancy', label: 'Occupancy Matrix', icon: Building2 },
          { key: 'room-standards', label: 'Room Standards', icon: Ruler },
          { key: 'construction', label: 'Construction Details', icon: HardHat },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === key
                ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
            }`}
            data-tab={key}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Occupancy Matrix ── */}
      {activeTab === 'occupancy' && (
        <div className="flex flex-col gap-3" data-tab-content="occupancy">
          {/* Filter + building-type badge */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Filter classes…"
              value={occFilter}
              onChange={(e) => setOccFilter(e.target.value)}
              className="flex-1 rounded border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/30"
            />
            {classifiedBuilding && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]">
                {buildingType} → {classifiedBuilding}
              </span>
            )}
          </div>

          {/* Matrix table */}
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Code</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Class</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Live Load (kPa)</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Travel Dist. (m)</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Fire Rating (min)</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-400">Accessible</th>
                </tr>
              </thead>
              <tbody>
                {filteredOccupancies.map((code) => {
                  const spec = OCCUPANCY_MATRIX[code]
                  const isMatch = classifiedBuilding === code
                  return (
                    <tr
                      key={code}
                      className={`border-b border-white/5 transition-colors hover:bg-white/5 ${
                        isMatch ? 'bg-[var(--brand-accent)]/10' : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold ${occBadgeClass(code)}`}>
                          {spec.code}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{spec.label}</td>
                      <td className="px-3 py-2 text-slate-400">{spec.description}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{spec.liveLoadKpa}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{spec.maxTravelDistanceM}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{spec.fireRatingMin}</td>
                      <td className="px-3 py-2 text-center">
                        {spec.accessibilityRequired ? (
                          <span className="text-green-400">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Room Standards ── */}
      {activeTab === 'room-standards' && (
        <div className="flex flex-col gap-3" data-tab-content="room-standards">
          <input
            type="text"
            placeholder="Filter rooms…"
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="rounded border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-[var(--brand-accent)]/30"
          />

          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="w-full text-xs" role="table">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Room</th>
                  <th className="px-3 py-2 text-left font-medium text-slate-400">Zone</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Min Width (m)</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Min Depth (m)</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Min Area (m²)</th>
                  <th className="px-3 py-2 text-right font-medium text-slate-400">Ceiling (m)</th>
                  <th className="px-3 py-2 text-center font-medium text-slate-400">Wet Core</th>
                </tr>
              </thead>
              <tbody>
                {filteredStandards.map((rs) => {
                  const zoneColor = ZONE_COLORS[rs.zone] ?? '#64748b'
                  return (
                    <tr key={rs.name} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 font-medium text-[var(--text-primary)]">{rs.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ backgroundColor: zoneColor + '20', color: zoneColor }}
                        >
                          {rs.zone}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{rs.minWidth}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">{rs.minDepth}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        {rs.minAreaM2 != null ? rs.minAreaM2.toFixed(1) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-300">
                        {rs.minCeilingHeight != null ? rs.minCeilingHeight.toFixed(1) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {rs.isWetCore ? (
                          <span className="text-cyan-400">✓</span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Construction Details ── */}
      {activeTab === 'construction' && (
        <div className="flex flex-col gap-3" data-tab-content="construction">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1">
            {DETAIL_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => selectDetailCategory(cat.key)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  detailCategory === cat.key
                    ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Detail list + preview */}
          <div className="flex gap-4">
            <div className="flex w-56 shrink-0 flex-col gap-1">
              <h3 className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {DETAIL_CATEGORIES.find((c) => c.key === detailCategory)?.label ?? detailCategory}
              </h3>
              {categoryDetails.map((detail) => (
                <button
                  key={detail.id}
                  onClick={() => setSelectedDetailId(detail.id)}
                  className={`rounded-md px-3 py-2 text-left text-xs transition-colors ${
                    selectedDetailId === detail.id
                      ? 'bg-[var(--brand-accent)]/15 text-[var(--brand-accent)] ring-1 ring-[var(--brand-accent)]/30'
                      : 'text-slate-300 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-medium">{detail.title}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">{detail.scale}</span>
                </button>
              ))}
              {categoryDetails.length === 0 && (
                <p className="px-2 text-[11px] text-slate-400">No details in this category.</p>
              )}
            </div>

            <div className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900/40 p-4">
              {selectedDetail ? (
                <div className="flex flex-col gap-4">
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">{selectedDetail.title}</h2>
                      <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        {selectedDetail.scale}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">{selectedDetail.description}</p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Key Dimensions</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                      {selectedDetail.dimensions.map((dim) => (
                        <div key={dim.label} className="flex items-baseline justify-between border-b border-white/5 pb-1">
                          <span className="text-[11px] text-slate-400">{dim.label}</span>
                          <span className="ml-2 text-[11px] font-medium text-[var(--text-primary)]">{dim.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Construction Notes</h3>
                    <ul className="flex flex-col gap-1.5">
                      {selectedDetail.constructionNotes.map((note, i) => (
                        <li key={i} className="flex gap-2 text-[11px] leading-relaxed text-slate-400">
                          <span className="mt-1 block h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400">Select a detail to preview.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
