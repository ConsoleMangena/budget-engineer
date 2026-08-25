import { snap } from '../../../engine/spatial/graph-placer'
import { computeAdjacencyScore, SCHOOL_ADJACENCY_RULES, roomGroupForSchool } from '../../../engine/spatial/adjacency-graph'
import { bubbleFromRooms } from '../../../engine/spatial/topological-graph'
import { getTypology } from '../../../engine/typology-kb'
import { templateForTypology } from '../layout-templates'
import { packTemplate } from '../grid-packer'
import type { FloorContext, FloorLayoutResult } from '../typology-types'
import type { AdjacencyRoom } from '../../../engine/spatial/adjacency-graph'
import type { AdjacencyGraphModel, CoreLayout, FloorPlateMetrics, StructuralGrid, AdjacencyRule } from '../../../engine/tier1-types'

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }
const DEFAULT_EFFICIENCY = 0.70

/**
 * Corridor-bar school layout:
 *
 * ```
 * [Classroom 1 | Classroom 2 | ... | Classroom N ]  ← top band
 * [Corridor — full width, 1.8 m]                     ← horizontal spine
 * [Library | Head's Office | Staff Room | Store ]    ← support band
 * [Toilet Block (stacked vertically in corner)]      ← core, bottom-left
 * ```
 *
 * Classrooms are arranged in a row at the top. The corridor runs the full
 * width below them. Support rooms sit below the corridor. Toilet blocks
 * stack vertically in the bottom-left corner as a core.
 */
function placeSchoolCorridor(
  rooms: { id: string; name: string; areaM2: number }[],
  width: number,
  height: number,
): { rooms: AdjacencyRoom[]; corridor: AdjacencyRoom; coreLayout: CoreLayout; floorPlate: FloorPlateMetrics; adjacency: AdjacencyGraphModel; score: number } {
  const corridorH = 1.8
  const coreW = 3.5

  const byName = (n: string) => rooms.find(r => r.name.toLowerCase().includes(n.toLowerCase()))

  const classrooms = rooms.filter(r => r.name.toLowerCase().includes('classroom'))
  const libraryRoom = byName('library')
  const officeRoom = byName('office') ?? byName('head')
  const staffRoom = byName('staff')
  const storeRoom = byName('store')
  const toiletRoom = byName('toilet')

  const placed: AdjacencyRoom[] = []

  // Classrooms — top band, each gets width proportional to area, full height.
  const totalClassroomArea = classrooms.reduce((s, c) => s + c.areaM2, 0)
  const classroomBandH = height * 0.50 // top 50% for classrooms
  let cx = 0
  for (const cr of classrooms) {
    const cw = snap(totalClassroomArea > 0 ? (cr.areaM2 / totalClassroomArea) * width : width / classrooms.length)
    const r: AdjacencyRoom = { id: cr.id, name: cr.name, x: cx, y: height - corridorH - classroomBandH, width: Math.min(cw, width - cx), height: classroomBandH }
    placed.push(r)
    cx += r.width
  }
  // Stretch last classroom to fill any rounding gap.
  if (classrooms.length > 0 && cx < width) {
    const last = placed[placed.length - 1]
    last.width = snap(width - last.x)
  }

  // Corridor — full width horizontal spine.
  const corridorY = height - corridorH
  const corridor: AdjacencyRoom = { id: 'corridor-0', name: 'Corridor', x: 0, y: corridorY, width, height: corridorH }
  placed.push(corridor)

  // Support band — below corridor, split among support rooms.
  const supportH = corridorY
  let sx = 0

  if (libraryRoom) {
    const lw = snap(Math.max(4.0, Math.min(width * 0.35, libraryRoom.areaM2 / supportH)))
    const r: AdjacencyRoom = { id: libraryRoom.id, name: libraryRoom.name, x: sx, y: 0, width: lw, height: supportH }
    placed.push(r)
    sx += r.width
  }
  if (staffRoom) {
    const sw = snap(Math.max(3.0, Math.min(width * 0.25, staffRoom.areaM2 / supportH)))
    const r: AdjacencyRoom = { id: staffRoom.id, name: staffRoom.name, x: sx, y: 0, width: sw, height: supportH }
    placed.push(r)
    sx += r.width
  }
  if (officeRoom) {
    const ow = snap(Math.max(3.0, Math.min(width * 0.2, officeRoom.areaM2 / supportH)))
    const r: AdjacencyRoom = { id: officeRoom.id, name: officeRoom.name, x: sx, y: 0, width: ow, height: supportH }
    placed.push(r)
    sx += r.width
  }
  if (storeRoom) {
    const stw = snap(Math.max(2.0, Math.min(width * 0.15, storeRoom.areaM2 / supportH)))
    const r: AdjacencyRoom = { id: storeRoom.id, name: storeRoom.name, x: sx, y: 0, width: stw, height: supportH }
    placed.push(r)
  }

  // Toilet blocks — stack vertically in bottom-left corner of the support band.
  if (toiletRoom) {
    const tw = coreW
    const th = snap(Math.min(supportH, toiletRoom.areaM2 / tw))
    const r: AdjacencyRoom = { id: toiletRoom.id, name: toiletRoom.name, x: 0, y: 0, width: tw, height: th }
    placed.push(r)
  }

  // Core block.
  const coreH = toiletRoom ? snap(toiletRoom.areaM2 / coreW) : 0
  const coreBlock: CoreLayout = toiletRoom
    ? { coreType: 'central', blocks: [{ roomIds: [toiletRoom.id], x: 0, y: 0, width: coreW, height: coreH }], x: 0, y: 0 }
    : { coreType: 'central', blocks: [], x: 0, y: 0 }

  // Floor plate metrics.
  const totalRoomArea = placed.reduce((s, r) => s + r.width * r.height, 0)
  const plateArea = width * height
  const circArea = corridor.width * corridor.height
  const coreArea = coreW * coreH
  const programArea = totalRoomArea - circArea - coreArea

  const floorPlate: FloorPlateMetrics = {
    totalAreaM2: plateArea,
    programAreaM2: programArea,
    efficiency: plateArea > 0 ? programArea / plateArea : 0,
    circulationAreaM2: circArea,
    coreAreaM2: coreArea,
    grid: DEFAULT_GRID,
    columns: Math.ceil(width / DEFAULT_GRID.spanX),
    rows: Math.ceil(height / DEFAULT_GRID.spanY),
  }

  // Adjacency score.
  const scoreResult = computeAdjacencyScore(
    SCHOOL_ADJACENCY_RULES,
    placed,
    (a: AdjacencyRoom, b: AdjacencyRoom) => {
      const ax2 = a.x + a.width, bx2 = b.x + b.width
      const ay2 = a.y + a.height, by2 = b.y + b.height
      return Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x)) > 0
        && Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y)) > 0
    },
    roomGroupForSchool,
  )

  return { rooms: placed, corridor, coreLayout: coreBlock, floorPlate, adjacency: scoreResult, score: scoreResult.score }
}

/**
 * School floor strategy.
 *
 * Primary path: corridor-bar geometry — classrooms in a top row, horizontal
 * corridor spine, support rooms below. The KB entry
 * (getTypology('school-classroom')) is the single authority for structural
 * grid / adjacency rules / nominal efficiency.
 *
 * Fallback path: grid-template packing when rooms don't fit.
 */
export function generateSchoolLayout(
  program: { name: string; ratio?: number; areaM2?: number }[],
  width: number,
  height: number,
  seed = 0,
  _floorContext?: FloorContext,
): FloorLayoutResult {
  const kb = getTypology('school-classroom')
  const grid: StructuralGrid = kb?.structuralGrid ?? DEFAULT_GRID
  const adjacencyRules: AdjacencyRule[] =
    kb?.adjacencyRules && kb.adjacencyRules.length > 0 ? kb.adjacencyRules : SCHOOL_ADJACENCY_RULES
  const floorPlateEfficiency = kb?.floorPlateEfficiency ?? DEFAULT_EFFICIENCY

  const totalAreaM2 = width * height
  const rooms = program
    .map((p, i) => ({
      id: `school-${i}`,
      name: p.name,
      areaM2: p.ratio != null ? p.ratio * totalAreaM2 : (p.areaM2 ?? 0),
    }))
    .filter(r => r.areaM2 > 0)

  const result = placeSchoolCorridor(rooms, width, height)

  if (result.rooms.length >= rooms.length - 1) {
    return {
      rooms: result.rooms.map(r => ({ id: r.id, name: r.name, x: r.x, y: r.y, width: r.width, height: r.height })),
      structuralGrid: grid,
      coreLayout: result.coreLayout,
      floorPlateMetrics: {
        ...result.floorPlate,
        efficiency: result.floorPlate.efficiency > 0 ? result.floorPlate.efficiency : floorPlateEfficiency,
      },
      adjacencyGraph: result.adjacency,
      bubbleDiagram: bubbleFromRooms(
        result.rooms.map(r => ({ id: r.id, name: r.name, width: r.width, height: r.height })),
        { typologyId: 'school-classroom', adjacencyRules, groupFor: roomGroupForSchool },
      ),
      valid: true,
    }
  }

  // Fallback: grid-template packing.
  const t = templateForTypology('school', totalAreaM2, seed)
  const packed = packTemplate(
    t,
    program.map(p => ({ name: p.name, ratio: p.ratio ?? 0 })),
    width,
    height,
    seed,
  )
  const valid = packed.valid && packed.warnings.filter(w => w.roomName && w.message.includes('invalid')).length === 0
  return {
    rooms: packed.rooms,
    warnings: packed.warnings.map(w => w.message),
    bubbleDiagram: bubbleFromRooms(packed.rooms, {
      typologyId: 'school-classroom',
      adjacencyRules,
      groupFor: roomGroupForSchool,
    }),
    valid,
    structuralGrid: grid,
  }
}
