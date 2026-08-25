import { snap } from '../../../engine/spatial/graph-placer'
import { computeAdjacencyScore, WAREHOUSE_ADJACENCY_RULES, roomGroupForWarehouse } from '../../../engine/spatial/adjacency-graph'
import { bubbleFromRooms } from '../../../engine/spatial/topological-graph'
import { getTypology } from '../../../engine/typology-kb'
import { templateForTypology } from '../layout-templates'
import { packTemplate } from '../grid-packer'
import type { FloorContext, FloorLayoutResult } from '../typology-types'
import type { AdjacencyRoom } from '../../../engine/spatial/adjacency-graph'
import type { AdjacencyGraphModel, CoreLayout, FloorPlateMetrics, StructuralGrid, AdjacencyRule } from '../../../engine/tier1-types'

const DEFAULT_GRID: StructuralGrid = { spanX: 7.2, spanY: 7.2 }
const DEFAULT_EFFICIENCY = 0.75

/**
 * Direct warehouse layout: warehouse floor occupies the central clear span,
 * support rooms are stacked in a narrow strip along the left edge, loading bay
 * is a full-width band at the front.
 *
 * ```
 * [Loading Bay — full-width front band, ~4 m deep]
 * [                                              ]
 * [Toilet  ] [          Warehouse Floor          ]
 * [Stair   ] [← main clear span fills remaining  ]
 * [Admin   ] [                                   ]
 * [Staff   ] [                                   ]
 * [Store   ] [                                   ]
 * [Corridor|1.5m                                 ]
 * ```
 */
function placeWarehouseFloor(
  rooms: { id: string; name: string; areaM2: number }[],
  width: number,
  height: number,
): { rooms: AdjacencyRoom[]; corridor: AdjacencyRoom | null; coreLayout: CoreLayout; floorPlate: FloorPlateMetrics; adjacency: AdjacencyGraphModel; score: number } {
  const corridorW = 1.5
  const coreW = 3.5

  const byName = (n: string) => rooms.find(r => r.name.toLowerCase().includes(n.toLowerCase()))
  const warehouseRoom = byName('warehouse') ?? byName('warehouse floor')
  const loadingRoom = byName('loading')
  const officeRoom = byName('office') ?? byName('admin')
  const staffRoom = byName('staff')
  const storeRoom = byName('store')
  const toiletRoom = byName('toilet')

  const placed: AdjacencyRoom[] = []

  // Loading bay — front band, full width, at top of plate.
  let loadingH = 0
  if (loadingRoom) {
    loadingH = snap(Math.max(4.0, Math.min(height * 0.22, loadingRoom.areaM2 / width)))
    placed.push({ id: loadingRoom.id, name: loadingRoom.name, x: 0, y: height - loadingH, width, height: loadingH })
  }

  // Remaining height below the loading bay.
  const bodyH = height - loadingH

  // Support strip — left edge, 3.5 m wide.
  const supportX = 0
  const supportW = coreW
  let supportY = 0

  // WC + Stair core in the strip.
  const coreRooms: AdjacencyRoom[] = []
  if (toiletRoom) {
    const th = snap(Math.max(2.0, Math.min(bodyH * 0.35, toiletRoom.areaM2 / supportW)))
    const r: AdjacencyRoom = { id: toiletRoom.id, name: toiletRoom.name, x: supportX, y: supportY, width: supportW, height: th }
    coreRooms.push(r)
    placed.push(r)
    supportY += th
  }
  if (officeRoom) {
    const oh = snap(Math.max(3.0, Math.min(bodyH * 0.25, officeRoom.areaM2 / supportW)))
    const r: AdjacencyRoom = { id: officeRoom.id, name: officeRoom.name, x: supportX, y: supportY, width: supportW, height: oh }
    placed.push(r)
    supportY += oh
  }
  if (staffRoom) {
    const sh = snap(Math.max(2.5, Math.min(bodyH * 0.2, staffRoom.areaM2 / supportW)))
    const r: AdjacencyRoom = { id: staffRoom.id, name: staffRoom.name, x: supportX, y: supportY, width: supportW, height: sh }
    placed.push(r)
    supportY += sh
  }
  if (storeRoom) {
    const sh = snap(Math.max(2.0, Math.min(bodyH * 0.15, storeRoom.areaM2 / supportW)))
    const r: AdjacencyRoom = { id: storeRoom.id, name: storeRoom.name, x: supportX, y: supportY, width: supportW, height: sh }
    placed.push(r)
    supportY += sh
  }

  const coreBlock: CoreLayout = coreRooms.length > 0
    ? { coreType: 'side', blocks: [{ roomIds: coreRooms.map(r => r.id), x: 0, y: 0, width: coreW, height: supportY }], x: 0, y: 0 }
    : { coreType: 'side', blocks: [], x: 0, y: 0 }

  // Corridor — vertical strip between core/support and warehouse floor.
  const corridorY = 0
  const corridorH = bodyH
  const corridor: AdjacencyRoom = { id: 'corridor-0', name: 'Corridor', x: coreW, y: corridorY, width: corridorW, height: corridorH }
  placed.push(corridor)

  // Warehouse Floor — fills remaining space to the right of corridor, below loading bay.
  if (warehouseRoom) {
    const whX = coreW + corridorW
    const whW = width - whX
    const whH = bodyH
    placed.push({ id: warehouseRoom.id, name: warehouseRoom.name, x: whX, y: 0, width: whW, height: whH })
  }

  // Floor plate metrics.
  const totalRoomArea = placed.reduce((s, r) => s + r.width * r.height, 0)
  const plateArea = width * height
  const circArea = corridor.width * corridor.height
  const coreBlockH = coreRooms.length > 0 ? supportY : 0
  const coreArea = coreW * coreBlockH
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
    WAREHOUSE_ADJACENCY_RULES,
    placed,
    (a: AdjacencyRoom, b: AdjacencyRoom) => {
      const ax2 = a.x + a.width, bx2 = b.x + b.width
      const ay2 = a.y + a.height, by2 = b.y + b.height
      return Math.max(0, Math.min(ax2, bx2) - Math.max(a.x, b.x)) > 0
        && Math.max(0, Math.min(ay2, by2) - Math.max(a.y, b.y)) > 0
    },
    roomGroupForWarehouse,
  )

  return { rooms: placed, corridor, coreLayout: coreBlock, floorPlate, adjacency: scoreResult, score: scoreResult.score }
}

/**
 * Warehouse floor strategy.
 *
 * Primary path: custom geometry that gives the warehouse floor the dominant
 * clear span with a narrow support strip along the left edge and a loading bay
 * band across the front. The KB entry (getTypology('warehouse-industrial')) is
 * the single authority for structural grid / adjacency rules / efficiency.
 *
 * For mezzanine floor contexts the strategy delegates to a simple strip layout.
 * Fallback path: grid-template packing.
 */
export function generateWarehouseLayout(
  program: { name: string; ratio?: number; areaM2?: number }[],
  width: number,
  height: number,
  seed = 0,
  floorContext?: FloorContext,
): FloorLayoutResult {
  if (floorContext?.floorRole === 'mezzanine-office') {
    return {
      rooms: program.map((p, i) => ({
        id: `wh-${i}`,
        name: p.name,
        x: (i / program.length) * width,
        y: 0,
        width: width / program.length,
        height,
      })),
    }
  }

  const kb = getTypology('warehouse-industrial')
  const grid: StructuralGrid = kb?.structuralGrid ?? DEFAULT_GRID
  const adjacencyRules: AdjacencyRule[] =
    kb?.adjacencyRules && kb.adjacencyRules.length > 0 ? kb.adjacencyRules : WAREHOUSE_ADJACENCY_RULES
  const floorPlateEfficiency = kb?.floorPlateEfficiency ?? DEFAULT_EFFICIENCY

  const totalAreaM2 = width * height
  const rooms = program
    .map((p, i) => ({
      id: `warehouse-${i}`,
      name: p.name,
      areaM2: p.ratio != null ? p.ratio * totalAreaM2 : (p.areaM2 ?? 0),
    }))
    .filter(r => r.areaM2 > 0)

  const result = placeWarehouseFloor(rooms, width, height)

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
        { typologyId: 'warehouse-industrial', adjacencyRules, groupFor: roomGroupForWarehouse },
      ),
      valid: true,
    }
  }

  // Fallback: grid-template packing.
  const t = templateForTypology('warehouse', totalAreaM2, seed)
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
      typologyId: 'warehouse-industrial',
      adjacencyRules,
      groupFor: roomGroupForWarehouse,
    }),
    valid,
    structuralGrid: grid,
  }
}
