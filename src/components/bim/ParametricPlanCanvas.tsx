import { useMemo } from 'react'
import type { PlanModel, Opening, RoomRect } from '@/domain/plan'
import { getRoomStandard } from '@/engine/standards/roomStandards'
import { classifyOccupancy, OCCUPANCY_MATRIX } from '@/engine/compliance/occupancyMatrix'
import {
  DimensionLineH,
  DimensionLineV,
  GridBubble,
  LevelMarker,
  TitleBlock,
  HatchDefs,
} from '@/components/drawings/cadPrimitives'
import { renderOpeningSymbol } from '@/lib/drawings/openingSymbolRenderer'
import { zoneColorsForRoom } from '@/lib/drawings/roomZoneColors'
import {
  CAD_HAIR,
  INK,
  INK_CUT,
  INK_DIMENSION,
  PAPER,
  PEN_025,
  PEN_050,
  metresToMm,
} from '@/components/drawings/cadConstants'
import { LW } from '@/lib/drawings/lineweights'

/* ──────────────────────────────────────────────────────────────── */
/*  Types                                                           */
/* ──────────────────────────────────────────────────────────────── */

export interface ParametricPlanCanvasProps {
  plan: PlanModel
  buildingType?: string
  className?: string
}

/* ──────────────────────────────────────────────────────────────── */
/*  Constants                                                       */
/* ──────────────────────────────────────────────────────────────── */

const DIM_RED = '#cc3333'
const DIM_TICK_EXT = 3
const DIM_OFFSET_FROM_WALL = 12
const DIM_BAY_OFFSET = DIM_OFFSET_FROM_WALL + 10
const DIM_OPENING_OFFSET = DIM_BAY_OFFSET + 10

const GRID_LINE_DASH = '2 1.5'

const FIRE_COMPARTMENT_STROKE = '#ef4444'
const FIRE_COMPARTMENT_DASH = '6 3'

const OCCUPANCY_COLORS: Record<string, string> = {
  A1: '#f43f5e', A2: '#f97316', A3: '#eab308',
  B1: '#22c55e', B2: '#10b981', B3: '#34d399',
  E1: '#3b82f6',
  F1: '#8b5cf6', F2: '#a78bfa', F3: '#c084fc',
  G1: '#6366f1',
  H1: '#ec4899', H2: '#f472b6',
  J1: '#dc2626', J2: '#ea580c', J3: '#f59e0b',
}

/* ──────────────────────────────────────────────────────────────── */
/*  Grid axis computation (same logic as planSheetRenderer)         */
/* ──────────────────────────────────────────────────────────────── */

interface GridAxis {
  id: string
  label: string
  position: number
  isHorizontal: boolean
}

function computeGridAxes(plan: PlanModel): GridAxis[] {
  const axes: GridAxis[] = []
  const xPositions = new Set<number>()
  const yPositions = new Set<number>()

  for (const wall of plan.walls) {
    if (Math.abs(wall.start.y - wall.end.y) < 0.01) {
      xPositions.add(wall.start.x)
      xPositions.add(wall.end.x)
    }
    if (Math.abs(wall.start.x - wall.end.x) < 0.01) {
      yPositions.add(wall.start.y)
      yPositions.add(wall.end.y)
    }
  }

  xPositions.add(plan.width)
  yPositions.add(plan.height)

  const sortedX = [...xPositions].sort((a, b) => a - b)
  const sortedY = [...yPositions].sort((a, b) => b - a)

  let labelIdx = 0
  for (const x of sortedX) {
    if (x > 0 && x <= plan.width) {
      axes.push({
        id: `grid-v-${labelIdx}`,
        label: String.fromCharCode(65 + labelIdx),
        position: x,
        isHorizontal: false,
      })
      labelIdx++
    }
  }

  labelIdx = 0
  for (const y of sortedY) {
    if (y > 0 && y <= plan.height) {
      axes.push({
        id: `grid-h-${labelIdx}`,
        label: `${labelIdx + 1}`,
        position: y,
        isHorizontal: true,
      })
      labelIdx++
    }
  }

  return axes
}

/* ──────────────────────────────────────────────────────────────── */
/*  Wall line extraction                                            */
/* ──────────────────────────────────────────────────────────────── */

interface WallLine {
  id: string
  x1: number; y1: number; x2: number; y2: number
  thickness: number
  type: 'external' | 'internal'
}

function extractWallLines(plan: PlanModel): WallLine[] {
  return plan.walls.map(w => ({
    id: w.id,
    x1: w.start.x, y1: w.start.y,
    x2: w.end.x, y2: w.end.y,
    thickness: w.thickness || plan.wallThickness || 0.23,
    type: w.type,
  }))
}

function findOpeningsOnWall(plan: PlanModel, wallId: string): Opening[] {
  return plan.openings.filter(o => o.wallId === wallId)
}

/* ──────────────────────────────────────────────────────────────── */
/*  Room metadata (occupancy class, zone, compliance)               */
/* ──────────────────────────────────────────────────────────────── */

interface RoomMeta {
  room: RoomRect
  zone: ReturnType<typeof zoneColorsForRoom>
  standard: ReturnType<typeof getRoomStandard>
  occupancyClass: string | null
  occupancySpec: ReturnType<typeof getOccupancySpec>
  areaM2: number
}

function getOccupancySpec(buildingType?: string) {
  if (!buildingType) return null
  const code = classifyOccupancy(buildingType)
  return OCCUPANCY_MATRIX[code] ?? null
}

function buildRoomMeta(plan: PlanModel, buildingType?: string): RoomMeta[] {
  const occSpec = getOccupancySpec(buildingType)
  return plan.rooms.map(room => {
    const standard = getRoomStandard(room.name)
    const zone = zoneColorsForRoom(room.name)
    const areaM2 = room.width * room.height
    return {
      room,
      zone,
      standard,
      occupancyClass: buildingType ? (occSpec?.code ?? null) : null,
      occupancySpec: occSpec,
      areaM2,
    }
  })
}

/* ──────────────────────────────────────────────────────────────── */
/*  Sub-renderers                                                   */
/* ──────────────────────────────────────────────────────────────── */

function GridLines({
  axes,
  ox,
  oy,
  planW,
  planH,
  scale,
}: {
  axes: GridAxis[]
  ox: number
  oy: number
  planW: number
  planH: number
  scale: number
}) {
  return (
    <g data-layer="grid-lines">
      {axes.map(ax => {
        const pos = ox + ax.position * scale
        if (ax.isHorizontal) {
          return (
            <line
              key={ax.id}
              x1={ox}
              y1={oy - pos}
              x2={ox + planW * scale}
              y2={oy - pos}
              stroke={INK_DIMENSION}
              strokeWidth={LW.GRID}
              strokeDasharray={GRID_LINE_DASH}
            />
          )
        }
        return (
          <line
            key={ax.id}
            x1={pos}
            y1={oy}
            x2={pos}
            y2={oy - planH * scale}
            stroke={INK_DIMENSION}
            strokeWidth={LW.GRID}
            strokeDasharray={GRID_LINE_DASH}
          />
        )
      })}
    </g>
  )
}

function Walls({
  wallLines,
  ox,
  oy,
  scale,
}: {
  wallLines: WallLine[]
  ox: number
  oy: number
  scale: number
}) {
  return (
    <g data-layer="walls">
      {wallLines.map(wall => {
        const wl = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1)
        if (wl < 0.01) return null
        const cx = (wall.x1 + wall.x2) / 2
        const cy = (wall.y1 + wall.y2) / 2
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1)
        const ww = wl * scale
        const wh = Math.max(wall.thickness * scale, 2)

        const isExternal = wall.type === 'external'
        return (
          <rect
            key={`wall-${wall.id}`}
            x={ox + cx * scale - ww / 2}
            y={oy - cy * scale - wh / 2}
            width={ww}
            height={wh}
            fill={isExternal ? INK_CUT : PAPER}
            stroke={INK}
            strokeWidth={isExternal ? PEN_050 : PEN_025}
            transform={`rotate(${-angle * (180 / Math.PI)}, ${ox + cx * scale}, ${oy - cy * scale})`}
            data-wall-type={wall.type}
          />
        )
      })}
    </g>
  )
}

function Openings({
  plan,
  wallLines,
  ox,
  oy,
  scale,
}: {
  plan: PlanModel
  wallLines: WallLine[]
  ox: number
  oy: number
  scale: number
}) {
  return (
    <g data-layer="openings">
      {wallLines.map(wall => {
        const openings = findOpeningsOnWall(plan, wall.id)
        return openings.map(opening => {
          const el = renderOpeningSymbol({
            opening,
            wallStartX: wall.x1, wallStartY: wall.y1,
            wallEndX: wall.x2, wallEndY: wall.y2,
            scale, ox, oy,
          })
          return el ? (
            <g key={`opening-${opening.id}`} data-opening-kind={opening.kind}>
              {el}
            </g>
          ) : null
        })
      })}
    </g>
  )
}

function Rooms({
  roomMetaList,
  ox,
  oy,
  scale,
}: {
  roomMetaList: RoomMeta[]
  ox: number
  oy: number
  scale: number
}) {
  return (
    <g data-layer="rooms">
      {roomMetaList.map(({ room, zone, areaM2, occupancyClass }, ri) => {
        const rx = ox + room.x * scale
        const ry = oy - (room.y + room.height) * scale
        const rw = room.width * scale
        const rh = room.height * scale
        const cx = rx + rw / 2
        const cy = ry + rh / 2
        const nameSize = room.width < 1.5 ? 0.18 : room.width < 2.5 ? 0.22 : 0.30
        const areaSize = room.width < 1.5 ? 0.14 : room.width < 2.5 ? 0.16 : 0.22
        const occColor = (occupancyClass ? OCCUPANCY_COLORS[occupancyClass] : undefined) ?? '#64748b'

        return (
          <g key={`room-${room.id}`} data-room-id={room.id}>
            {/* Zone-coloured fill */}
            <rect
              x={rx}
              y={ry}
              width={rw}
              height={rh}
              fill={zone.fill}
              stroke={zone.stroke}
              strokeWidth={LW.PARTITION}
              fillOpacity={0.45}
              data-room-bg={room.id}
            />

            {/* Room name */}
            <text
              x={cx}
              y={cy - 0.10 * scale}
              fill={zone.text}
              fontSize={nameSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
              fontFamily="Inter, system-ui, sans-serif"
              fontWeight="600"
            >
              {room.name || `Room ${ri + 1}`}
            </text>

            {/* Area */}
            <text
              x={cx}
              y={cy + 0.10 * scale}
              fill={zone.text}
              fontSize={areaSize}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
              fontFamily="Inter, system-ui, sans-serif"
              opacity={0.7}
            >
              {areaM2.toFixed(1)} m²
            </text>

            {/* Occupancy class badge (small coloured dot) */}
            {occupancyClass && (
              <g data-occupancy={occupancyClass}>
                <circle
                  cx={rx + rw - 4}
                  cy={ry + 4}
                  r={2.5}
                  fill={occColor}
                />
                <text
                  x={rx + rw - 4}
                  y={ry + 4.5}
                  fill="#fff"
                  fontSize={3}
                  textAnchor="middle"
                  fontWeight="bold"
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {occupancyClass}
                </text>
              </g>
            )}

            {/* Dimension annotation (room width) */}
            <text
              x={cx}
              y={ry + rh + 3}
              fill={DIM_RED}
              fontSize={3}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {metresToMm(room.width)}
            </text>

            {/* Dimension annotation (room height) */}
            <text
              x={rx + rw + 3}
              y={cy + 1}
              fill={DIM_RED}
              fontSize={3}
              textAnchor="start"
              fontFamily="JetBrains Mono, monospace"
              transform={`rotate(-90, ${rx + rw + 3}, ${cy + 1})`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {metresToMm(room.height)}
            </text>
          </g>
        )
      })}
    </g>
  )
}

function EgressOverlay({
  plan,
  ox,
  oy,
  scale,
}: {
  plan: PlanModel
  ox: number
  oy: number
  scale: number
}) {
  if (!plan.egressPoints || plan.egressPoints.length === 0) return null

  const colors: Record<string, string> = { 'main-entry': '#22c55e', 'secondary-exit': '#f59e0b', 'emergency-exit': '#ef4444' }
  const labels: Record<string, string> = { 'main-entry': 'MAIN', 'secondary-exit': 'SEC', 'emergency-exit': 'EMERG' }

  return (
    <g data-layer="egress">
      {plan.egressPoints.map((ep, i) => {
        const color = colors[ep.type] ?? '#94a3b8'
        const label = labels[ep.type] ?? ep.type
        const sx = ox + ep.x * scale
        const sy = oy - ep.y * scale
        return (
          <g key={`egress-${i}`}>
            <circle cx={sx} cy={sy} r={4} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={0.5} />
            <circle cx={sx} cy={sy} r={1.5} fill={color} />
            <text x={sx} y={sy - 5} fill={color} fontSize={5} fontWeight="bold" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">{label}</text>
            <text x={sx} y={sy + 6} fill={color} fontSize={4} textAnchor="middle" fontFamily="Inter, system-ui, sans-serif">{ep.label}</text>
          </g>
        )
      })}
    </g>
  )
}

function FireCompartmentOverlay({
  roomMetaList,
  ox,
  oy,
  scale,
}: {
  roomMetaList: RoomMeta[]
  ox: number
  oy: number
  scale: number
}) {
  const spec = roomMetaList[0]?.occupancySpec
  if (!spec) return null

  return (
    <g data-layer="fire-compartments" data-fire-rating={spec.fireRatingMin}>
      {roomMetaList.map(({ room }) => {
        const rx = ox + room.x * scale
        const ry = oy - (room.y + room.height) * scale
        const rw = room.width * scale
        const rh = room.height * scale
        return (
          <rect
            key={`fire-${room.id}`}
            x={rx}
            y={ry}
            width={rw}
            height={rh}
            fill="none"
            stroke={FIRE_COMPARTMENT_STROKE}
            strokeWidth={LW.DIMENSION}
            strokeDasharray={FIRE_COMPARTMENT_DASH}
            opacity={0.4}
          />
        )
      })}
    </g>
  )
}

function NorthArrow({
  ox,
  planW,
  oy,
  planH,
}: {
  ox: number
  planW: number
  oy: number
  planH: number
}) {
  const naX = ox + planW + 25
  const naY = oy - planH + 15
  const naSize = 8
  return (
    <g key="north-arrow" data-layer="north-arrow">
      <circle cx={naX} cy={naY} r={naSize + 4} fill="none" stroke={INK} strokeWidth={CAD_HAIR} />
      <polygon
        points={`${naX},${naY - naSize - 3} ${naX - 3},${naY + naSize - 3} ${naX},${naY + naSize * 0.3} ${naX + 3},${naY + naSize - 3}`}
        fill={INK}
      />
      <polygon
        points={`${naX},${naY + naSize + 3} ${naX - 3},${naY - naSize + 3} ${naX},${naY - naSize * 0.3} ${naX + 3},${naY - naSize + 3}`}
        fill={PAPER}
        stroke={INK}
        strokeWidth={CAD_HAIR}
      />
      <text x={naX} y={naY + naSize + 10} fontSize={6} fill={INK} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle" fontWeight="bold">N</text>
    </g>
  )
}

function ScaleBar({
  ox,
  sheetH,
  scale,
}: {
  ox: number
  sheetH: number
  scale: number
}) {
  const barY = sheetH - 50
  const barLen = 50
  const segs = 4
  const segLen = barLen / segs

  return (
    <g key="scale-bar" data-layer="scale-bar">
      <text x={ox} y={barY - 4} fontSize={5} fill={INK_DIMENSION} fontFamily="Inter, system-ui, sans-serif">
        SCALE BAR (m)
      </text>
      {Array.from({ length: segs }, (_, i) => {
        const segX = ox + i * segLen
        const metres = Math.round((i * barLen / segs / scale) * 100) / 100
        return (
          <g key={`sb-${i}`}>
            <rect x={segX} y={barY} width={segLen} height={4} fill={i % 2 === 0 ? INK : PAPER} stroke={INK} strokeWidth={CAD_HAIR} />
            <text x={segX + segLen / 2} y={barY + 10} fontSize={5} fill={INK} fontFamily="Inter, system-ui, sans-serif" textAnchor="middle">
              {metres}m
            </text>
          </g>
        )
      })}
    </g>
  )
}

/* ──────────────────────────────────────────────────────────────── */
/*  Main component                                                  */
/* ──────────────────────────────────────────────────────────────── */

export function ParametricPlanCanvas({
  plan,
  buildingType,
  className,
}: ParametricPlanCanvasProps) {
  const drawingW = 350
  const drawingH = 250
  const scale = Math.min(drawingW / plan.width, drawingH / plan.height)
  const ox = 40
  const oy = 30 + plan.height * scale + DIM_OPENING_OFFSET + DIM_TICK_EXT + 20
  const sheetW = ox + plan.width * scale + 40
  const sheetH = oy + 10 + 60

  const wallLines = useMemo(() => extractWallLines(plan), [plan])
  const gridAxes = useMemo(() => computeGridAxes(plan), [plan])
  const roomMeta = useMemo(() => buildRoomMeta(plan, buildingType), [plan, buildingType])

  return (
    <svg
      viewBox={`0 0 ${sheetW} ${sheetH}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      data-component="ParametricPlanCanvas"
      data-plan-width={plan.width}
      data-plan-height={plan.height}
      data-room-count={plan.rooms.length}
      data-wall-count={plan.walls.length}
      data-opening-count={plan.openings.length}
    >
      {/* Paper background */}
      <rect x={0} y={0} width={sheetW} height={sheetH} fill={PAPER} data-layer="background" />

      {/* Hatch definitions */}
      <HatchDefs />

      {/* Structural grid (dashed lines + bubbles) */}
      <GridLines axes={gridAxes} ox={ox} oy={oy} planW={plan.width} planH={plan.height} scale={scale} />

      {/* Walls (external solid poché, internal outline) */}
      <Walls wallLines={wallLines} ox={ox} oy={oy} scale={scale} />

      {/* Opening symbols (doors, windows) */}
      <Openings plan={plan} wallLines={wallLines} ox={ox} oy={oy} scale={scale} />

      {/* Room fills (zone-coloured) + labels + occupancy badges */}
      <Rooms roomMetaList={roomMeta} ox={ox} oy={oy} scale={scale} />

      {/* Fire compartment overlay (dashed red boundary per room) */}
      <FireCompartmentOverlay roomMetaList={roomMeta} ox={ox} oy={oy} scale={scale} />

      {/* Egress overlay */}
      <EgressOverlay plan={plan} ox={ox} oy={oy} scale={scale} />

      {/* Grid bubbles (top) */}
      {gridAxes
        .filter(ax => !ax.isHorizontal)
        .map(ax => (
          <GridBubble
            key={`grid-bubble-${ax.id}`}
            cx={ox + ax.position * scale}
            cy={DIM_OPENING_OFFSET + 10}
            label={ax.label}
            dropToY={oy - plan.height * scale - DIM_OPENING_OFFSET}
          />
        ))}

      {/* ── Tier 1: Overall dimensions ── */}
      <DimensionLineH
        key="dim-overall-w"
        x1={ox}
        x2={ox + plan.width * scale}
        y={oy - plan.height * scale - DIM_OFFSET_FROM_WALL}
        label={metresToMm(plan.width)}
        style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 6, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 2 }}
      />
      <DimensionLineV
        key="dim-overall-h"
        y1={oy - plan.height * scale}
        y2={oy}
        x={ox - DIM_OFFSET_FROM_WALL}
        label={metresToMm(plan.height)}
        style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 6, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 2 }}
      />

      {/* ── Tier 2: Structural bay dimensions ── */}
      {(() => {
        const hWalls = wallLines.filter(w => Math.abs(w.y1 - w.y2) < 0.01 && w.type === 'external')
        const vWalls = wallLines.filter(w => Math.abs(w.x1 - w.x2) < 0.01 && w.type === 'external')
        const bayY = oy - plan.height * scale - DIM_BAY_OFFSET
        const bayX = ox - DIM_BAY_OFFSET
        const dims: React.ReactNode[] = []

        if (hWalls.length >= 2) {
          const sorted = [...hWalls].sort((a, b) => Math.min(a.x1, a.x2) - Math.min(b.x1, b.x2))
          for (let i = 0; i < sorted.length - 1; i++) {
            const left = Math.min(sorted[i].x1, sorted[i].x2)
            const right = Math.max(sorted[i + 1].x1, sorted[i + 1].x2)
            if (right - left > 0.5) {
              dims.push(
                <DimensionLineH
                  key={`dim-bay-h-${i}`}
                  x1={ox + left * scale}
                  x2={ox + right * scale}
                  y={bayY}
                  label={metresToMm(right - left)}
                  style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 5, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 1.5 }}
                />,
              )
            }
          }
        }

        if (vWalls.length >= 2) {
          const sorted = [...vWalls].sort((a, b) => Math.min(a.y1, a.y2) - Math.min(b.y1, b.y2))
          for (let i = 0; i < sorted.length - 1; i++) {
            const bottom = Math.min(sorted[i].y1, sorted[i].y2)
            const top = Math.max(sorted[i + 1].y1, sorted[i + 1].y2)
            if (top - bottom > 0.5) {
              dims.push(
                <DimensionLineV
                  key={`dim-bay-v-${i}`}
                  y1={oy - top * scale}
                  y2={oy - bottom * scale}
                  x={bayX}
                  label={metresToMm(top - bottom)}
                  style={{ lineColor: DIM_RED, textColor: DIM_RED, textHeight: 5, extensionLineExtend: DIM_TICK_EXT, offsetFromOrigin: 1.5 }}
                />,
              )
            }
          }
        }

        return <g data-layer="dimensions">{dims}</g>
      })()}

      {/* North arrow */}
      <NorthArrow ox={ox} planW={plan.width} oy={oy} planH={plan.height} />

      {/* Level marker */}
      <LevelMarker x={ox + 5} y={oy - plan.height * scale - 5} label="FFL ±0.000" />

      {/* Scale bar */}
      <ScaleBar ox={ox} sheetH={sheetH} scale={scale} />

      {/* Caption */}
      <text
        key="caption"
        x={ox + (plan.width * scale) / 2}
        y={oy + 20}
        fontSize={8}
        fill={INK}
        fontFamily="Inter, system-ui, sans-serif"
        textAnchor="middle"
        fontWeight="bold"
      >
        PARAMETRIC FLOOR PLAN
      </text>

      <text
        key="scale-label"
        x={ox + (plan.width * scale) / 2}
        y={oy + 30}
        fontSize={6}
        fill={INK_DIMENSION}
        fontFamily="Inter, system-ui, sans-serif"
        textAnchor="middle"
      >
        {plan.scaleLabel || 'SCALE 1:100'}
      </text>

      {/* Building type badge */}
      {buildingType && (
        <text
          key="building-type"
          x={ox + (plan.width * scale) / 2}
          y={oy + 40}
          fontSize={5}
          fill={INK_DIMENSION}
          fontFamily="Inter, system-ui, sans-serif"
          textAnchor="middle"
        >
          {buildingType} · {OCCUPANCY_MATRIX[classifyOccupancy(buildingType)]?.label ?? ''}
        </text>
      )}

      {/* Title block */}
      <TitleBlock
        key="title-block"
        title="PARAMETRIC FLOOR PLAN"
        projectName="Budget Engineer"
        sheetWidth={sheetW}
        sheetHeight={sheetH}
      />
    </svg>
  )
}

/**
 * Export the SVG element as a data URI for PDF/Print integration.
 * Call this with the rendered SVG ref's outerHTML.
 */
export function parametricPlanToDataUri(svgElement: SVGSVGElement): string {
  const svgData = new XMLSerializer().serializeToString(svgElement)
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`
}

/**
 * Export the plan as a downloadable SVG file.
 */
export function downloadParametricPlan(svgElement: SVGSVGElement, filename = 'parametric-plan.svg'): void {
  const svgData = new XMLSerializer().serializeToString(svgElement)
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
