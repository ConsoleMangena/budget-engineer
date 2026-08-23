import { useState, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import {
  Download, FileText, Layers, Eye, ChevronRight,
  Building2, Map as MapIcon, Ruler, Flame, Droplets, Monitor, Grid3X3,
} from 'lucide-react'
import type { PlanModel } from '@/domain/plan'
import type { DesignOption } from '@/domain/boq'
import {
  generateFullSetSync,
  type FullSetResult,
  type FullSetDrawing,
  type ComplianceCitation,
} from '@/engine/architecture/fullSetGenerator'
import { PascalViewer } from './PascalViewer'
import { DrawIoEditor } from './DrawIoEditor'

/* ──────────────────────────────────────────────────────────────── */
/*  Types                                                           */
/* ──────────────────────────────────────────────────────────────── */

export interface DocsAndBimPackageProps {
  activePlan: PlanModel | null
  selectedDesign: DesignOption | null
  height?: number
}

type SheetCategory =
  | 'overview'
  | 'plans'
  | 'elevations'
  | 'sections'
  | 'structural'
  | 'mep'
  | 'schedules'
  | 'compliance'

interface SheetEntry {
  id: string
  number: string
  title: string
  category: SheetCategory
  icon: typeof Layers
  scale: string
  /** Per-SADC-code spec description for info tooltip. */
  spec: string
}

/* ──────────────────────────────────────────────────────────────── */
/*  18-Sheet SADC Council Package Registry                         */
/*  Numbering aligned with fullSetGenerator DRAWING_TABLE §6.2     */
/* ──────────────────────────────────────────────────────────────── */

const SHEETS: SheetEntry[] = [
  {
    id: 'cover', number: 'A-001',
    title: 'Cover Sheet — Project Information',
    category: 'overview', icon: FileText, scale: 'N/A',
    spec: 'Project title, client, site, architect ACZ registry number per SI 56/2025, north arrow, drawing list, area schedule.',
  },
  {
    id: 'site-plan', number: 'A-101',
    title: 'Site Plan',
    category: 'plans',     icon: MapIcon, scale: '1:200',
    spec: 'Boundaries, setbacks per By-Laws Ch.2 (front 3m, rear 2m, sides 1.5m), zoning, utilities, geotechnical, north, scale 1:200, contours.',
  },
  {
    id: 'floor-plan', number: 'A-102',
    title: 'Floor Plans — All Levels',
    category: 'plans', icon: Building2, scale: '1:100',
    spec: 'Functional zoning, core planning, workspace layouts, meeting rooms, reception, visitor circulation, emergency exits, daylighting, accessibility, structural grid, building services, dimensions per ZIQS SMM. Grid bubbles, wall-type hatchings. 1:100.',
  },
  {
    id: 'ceiling-plan', number: 'A-103',
    title: 'Reflected Ceiling Plan',
    category: 'plans', icon: Grid3X3, scale: '1:100',
    spec: 'Lighting layout, HVAC diffuser placement, ceiling grid, service routing. 1:100.',
  },
  {
    id: 'roof-plan', number: 'A-104',
    title: 'Roof Plan',
    category: 'plans', icon: Layers, scale: '1:100',
    spec: 'Roof drainage falls, rainwater goods, flashing details, rooflight positions. 1:100.',
  },
  {
    id: 'section-long', number: 'A-201',
    title: 'Section — Longitudinal',
    category: 'sections', icon: Ruler, scale: '1:100',
    spec: 'Foundation, frame, roof. IfcWallStandardCase thicknesses, structural loading. 1:100.',
  },
  {
    id: 'section-cross', number: 'A-202',
    title: 'Section — Cross',
    category: 'sections', icon: Ruler, scale: '1:100',
    spec: 'Cross-section through building showing structural members, floor-to-ceiling heights, roof pitch. 1:100.',
  },
  {
    id: 'elevation-north', number: 'A-301',
    title: 'Elevation — North',
    category: 'elevations', icon: Building2, scale: '1:100',
    spec: 'Façade materials, fenestration. "Inside out — great architecture starts from thoughtful plan." 1:100.',
  },
  {
    id: 'elevation-south', number: 'A-302',
    title: 'Elevation — South',
    category: 'elevations', icon: Building2, scale: '1:100',
    spec: 'Rear elevation showing openings, materials, finishes. 1:100.',
  },
  {
    id: 'elevation-east', number: 'A-303',
    title: 'Elevation — East',
    category: 'elevations', icon: Building2, scale: '1:100',
    spec: 'Side elevation showing wall construction, window positions. 1:100.',
  },
  {
    id: 'elevation-west', number: 'A-304',
    title: 'Elevation — West',
    category: 'elevations', icon: Building2, scale: '1:100',
    spec: 'Side elevation showing wall construction, window positions. 1:100.',
  },
  {
    id: 'foundation-plan', number: 'A-401',
    title: 'Foundation Plan',
    category: 'structural', icon: Grid3X3, scale: '1:50',
    spec: 'Strip foundations, depth min 600mm per Ch.4 Cl.12(a), width per load, reinforcement. 1:50.',
  },
  {
    id: 'structural-framing', number: 'A-402',
    title: 'Structural Framing Plan',
    category: 'structural', icon: Grid3X3, scale: '1:100',
    spec: 'Grid coordination, space optimization, beams, columns. IfcSpace occupancy design population mandatory per TopologicPy centrality. 1:100.',
  },
  {
    id: 'mep-services', number: 'A-501',
    title: 'MEP Services Plan',
    category: 'mep', icon: Droplets, scale: '1:100',
    spec: 'HVAC ducting, electrical routing, plumbing, building services integration. Wet zones share plumbing walls. 1:100.',
  },
  {
    id: 'fire-egress', number: 'A-502',
    title: 'Fire Egress Plan',
    category: 'mep', icon: Flame, scale: '1:100',
    spec: 'Emergency exits: 2 exits minimum. Travel distance max 45m per Grade A-D. Fire doors 2HR. Egress 1.2m. Shortest-path via TopologicPy dual graph. Fire compartmentation via IfcRelSpaceBoundary. 1:100.',
  },
  {
    id: 'accessibility', number: 'A-503',
    title: 'Accessibility Plan',
    category: 'mep', icon: Monitor, scale: '1:100',
    spec: 'Universal design: door 0.9m, corridor 1.2m, turning circle 1.5m per By-Laws Ch.4 via TopologicPy accessibility. 1:100.',
  },
  {
    id: 'door-window', number: 'A-601',
    title: 'Door / Window Schedule',
    category: 'schedules', icon: FileText, scale: 'N/A',
    spec: 'Types, sizes, fire ratings. IfcDoorStandardCase / IfcWindowStandardCase attributes. 3D BIM Model IFC export.',
  },
  {
    id: 'area-schedule', number: 'A-602',
    title: 'Area Schedule — Room Areas',
    category: 'schedules', icon: FileText, scale: 'N/A',
    spec: 'Room areas per ZIQS SMM, graph attributes, compass orientations per MSD Modified Swiss Dwellings multi-unit complex. SANS 10400 occupancy matrix, room-standards registry. Construction details browser.',
  },
]

const CATEGORY_META: Record<SheetCategory, { label: string; color: string }> = {
  overview:    { label: 'Overview',        color: '#d4a574' },
  plans:       { label: 'Plans',           color: '#3b82f6' },
  elevations:  { label: 'Elevations',      color: '#22c55e' },
  sections:    { label: 'Sections',        color: '#f59e0b' },
  structural:  { label: 'Structural',      color: '#8b5cf6' },
  mep:         { label: 'MEP & Safety',    color: '#ef4444' },
  schedules:   { label: 'Schedules',       color: '#06b6d4' },
  compliance:  { label: 'Compliance',      color: '#d4a574' },
}

/* ──────────────────────────────────────────────────────────────── */
/*  Component                                                       */
/* ──────────────────────────────────────────────────────────────── */

export function DocsAndBimPackage({
  activePlan,
  selectedDesign,
  height = 600,
}: DocsAndBimPackageProps) {
  const [activeSheetId, setActiveSheetId] = useState('cover')
  const [viewMode, setViewMode] = useState<'3d' | '2d' | 'svg'>('svg')
  const [xmlMap, setXmlMap] = useState<Record<string, string>>({})
  const [showSpec, setShowSpec] = useState(false)

  const activeSheet = useMemo(
    () => SHEETS.find((s) => s.id === activeSheetId) ?? SHEETS[0],
    [activeSheetId],
  )

  /* Generate the full drawing set from the active plan */
  const fullSet = useMemo<FullSetResult | null>(() => {
    if (!activePlan) return null
    return generateFullSetSync({
      plan: activePlan,
      buildingType: selectedDesign?.buildingType ?? 'house',
      projectName: selectedDesign?.name ?? 'Budget Engineer Project',
      jurisdiction: 'zimbabwe',
    })
  }, [activePlan, selectedDesign])

  /* Map a SHEET id to the FullSetDrawing drawing id */
  const drawingForSheet = useMemo(() => {
    if (!fullSet) return new Map<string, FullSetDrawing>()
    const map = new Map<string, FullSetDrawing>()
    for (const d of fullSet.drawings) map.set(d.id, d)
    return map
  }, [fullSet])

  /* Find the matching FullSetDrawing for the active sheet */
  const activeDrawing = useMemo(() => {
    const idMap: Record<string, string> = {
      'cover': 'cover-sheet',
      'site-plan': 'site-plan',
      'floor-plan': 'ground-floor-plan',
      'ceiling-plan': 'ceiling-plan',
      'roof-plan': 'roof-plan',
      'section-long': 'section',
      'section-cross': 'section',
      'elevation-north': 'front-elevation',
      'elevation-south': 'rear-elevation',
      'elevation-east': 'left-elevation',
      'elevation-west': 'right-elevation',
      'foundation-plan': 'foundation-plan',
      'structural-framing': 'structural-framing',
      'mep-services': 'mep-services',
      'fire-egress': 'fire-egress-plan',
      'accessibility': 'accessibility-plan',
      'door-window': 'door-window-schedule',
      'area-schedule': 'area-schedule',
    }
    const drawId = idMap[activeSheetId]
    return drawId ? drawingForSheet.get(drawId) ?? null : null
  }, [activeSheetId, drawingForSheet])

  const sheetsByCategory = useMemo(() => {
    const grouped: Record<SheetCategory, SheetEntry[]> = {
      overview: [], plans: [], elevations: [], sections: [],
      structural: [], mep: [], schedules: [], compliance: [],
    }
    for (const sheet of SHEETS) {
      grouped[sheet.category].push(sheet)
    }
    return grouped
  }, [])

  const handleXmlChange = useCallback(
    (xml: string) => {
      setXmlMap((prev) => ({ ...prev, [activeSheetId]: xml }))
    },
    [activeSheetId],
  )

  const handleDownload = useCallback(() => {
    const exportData = {
      format: 'SADC Council Package',
      version: '1.0',
      sheets: SHEETS.map((s) => ({
        ...s,
        svg: drawingForSheet.get(
          { 'cover': 'cover-sheet', 'site-plan': 'site-plan', 'floor-plan': 'ground-floor-plan',
            'ceiling-plan': 'ceiling-plan', 'roof-plan': 'roof-plan',
            'section-long': 'section', 'section-cross': 'section',
            'elevation-north': 'front-elevation', 'elevation-south': 'rear-elevation',
            'elevation-east': 'left-elevation', 'elevation-west': 'right-elevation',
            'foundation-plan': 'foundation-plan', 'structural-framing': 'structural-framing',
            'mep-services': 'mep-services', 'fire-egress': 'fire-egress-plan',
            'accessibility': 'accessibility-plan', 'door-window': 'door-window-schedule',
            'area-schedule': 'area-schedule',
          }[s.id] ?? '',
        )?.svg ?? '',
        xml: xmlMap[s.id] ?? '',
      })),
      ifcEntityCount: fullSet?.ifcEntityCount ?? 0,
      compliance: fullSet?.complianceReport ?? null,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'council-package.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [xmlMap, drawingForSheet, fullSet])

  const completedCount = Object.keys(xmlMap).length

  return (
    <div
      className="flex flex-col rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden"
      data-component="docs-and-bim-package"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--brand-accent)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">
            18-Sheet SADC Council Package
          </span>
          <span className="text-[10px] text-slate-400 bg-slate-800 rounded px-1.5 py-0.5 font-mono">
            {SHEETS.length} sheets
          </span>
          {completedCount > 0 && (
            <span className="text-[10px] text-green-400 bg-green-900/30 rounded px-1.5 py-0.5 font-mono">
              {completedCount} edited
            </span>
          )}
          {fullSet && (
            <span className="text-[10px] text-cyan-400 bg-cyan-900/30 rounded px-1.5 py-0.5 font-mono">
              {fullSet.ifcEntityCount} IFC entities
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          {(['svg', '3d', '2d'] as const).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'brand' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode)}
              className="text-xs h-7 px-2"
              data-view={mode}
            >
              {mode === 'svg' && <><FileText className="h-3 w-3 mr-1" /> SVG</>}
              {mode === '3d' && <><Eye className="h-3 w-3 mr-1" /> 3D</>}
              {mode === '2d' && <><Layers className="h-3 w-3 mr-1" /> 2D</>}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={handleDownload} className="text-xs h-7 px-2">
            <Download className="h-3 w-3 mr-1" /> Export
          </Button>
        </div>
      </div>

      {/* Bento Grid: 2/3 primary + 1/3 sidebar */}
      <div className="flex" style={{ height }}>
        {/* Sidebar — sheet list */}
        <div className="w-64 shrink-0 border-r border-white/10 overflow-y-auto bg-slate-900/50">
          {(Object.entries(sheetsByCategory) as [SheetCategory, SheetEntry[]][]).map(([cat, sheets]) => {
            const meta = CATEGORY_META[cat]
            if (sheets.length === 0) return null
            return (
              <div key={cat}>
                <div
                  className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-800/50"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </div>
                {sheets.map((sheet) => {
                  const Icon = sheet.icon
                  return (
                    <button
                      key={sheet.id}
                      onClick={() => setActiveSheetId(sheet.id)}
                      className={`w-full text-left px-3 py-2 text-xs border-b border-white/5 transition-colors ${
                        activeSheetId === sheet.id
                          ? 'bg-[var(--brand-accent)]/10 text-[var(--brand-accent)]'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                      data-sheet-id={sheet.id}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                        <span className="font-mono text-[10px] mr-1" style={{ color: meta.color }}>
                          {sheet.number}
                        </span>
                        <span className="truncate">{sheet.title}</span>
                        {xmlMap[sheet.id] && <span className="ml-auto text-green-400">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Primary content area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Sheet info bar */}
          <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2">
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: CATEGORY_META[activeSheet.category].color + '20',
                color: CATEGORY_META[activeSheet.category].color,
              }}
            >
              {activeSheet.number}
            </span>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {activeSheet.title}
            </span>
            <span className="text-[10px] text-slate-400 font-mono ml-1">
              {activeSheet.scale}
            </span>
            <button
              onClick={() => setShowSpec(!showSpec)}
              className="ml-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-300"
              data-testid="spec-toggle"
            >
              <ChevronRight className={`h-3 w-3 transition-transform ${showSpec ? 'rotate-90' : ''}`} />
              Specification
            </button>
          </div>

          {/* Spec panel */}
          {showSpec && (
            <div className="px-4 py-3 border-b border-white/5 bg-slate-900/30">
              <p className="text-xs leading-relaxed text-slate-400">{activeSheet.spec}</p>
              {activeDrawing && activeDrawing.citations.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {activeDrawing.citations.slice(0, 5).map((c: ComplianceCitation, i: number) => (
                    <span
                      key={i}
                      className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        c.status === 'pass'
                          ? 'bg-green-900/30 text-green-400'
                          : c.status === 'warn'
                            ? 'bg-amber-900/30 text-amber-400'
                            : 'bg-red-900/30 text-red-400'
                      }`}
                    >
                      {c.citation}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* View content */}
          <div className="flex-1 overflow-hidden">
            {viewMode === '3d' ? (
              <PascalViewer height={height - 120} />
            ) : viewMode === '2d' ? (
              <DrawIoEditor
                initialXml={xmlMap[activeSheetId] ?? ''}
                onXmlChange={handleXmlChange}
                height={height - 120}
              />
            ) : (
              /* SVG view — rendered SVG from FullSetGenerator */
              <div className="h-full overflow-auto bg-white p-4" data-testid="svg-view">
                {activeDrawing?.svg ? (
                  <div
                    className="mx-auto"
                    style={{ maxWidth: activeDrawing.dimensions.width }}
                    dangerouslySetInnerHTML={{ __html: activeDrawing.svg }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                      <FileText className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                      <p className="text-sm text-slate-400">
                        {activePlan
                          ? 'Generating SVG…'
                          : 'Load a plan to generate drawing set.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
