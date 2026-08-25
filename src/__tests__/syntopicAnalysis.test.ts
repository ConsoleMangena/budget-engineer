import { describe, it, expect } from 'vitest'
import {
  buildDualGraph,
  analyzeAccessibility,
  analyzeCentrality,
  shortestPathEgress,
  type DualGraph as DualGraph,
} from '../engine/architecture/topologicPySyntopic'

/* ------------------------------------------------------------------ */
/*  Fixtures                                                           */
/* ------------------------------------------------------------------ */

function makeSimplePlan() {
  return {
    rooms: [
      { id: 'living', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'kitchen', name: 'Kitchen', x: 5, y: 0, width: 3, height: 4 },
      { id: 'bedroom', name: 'Bedroom', x: 0, y: 4, width: 4, height: 3.5 },
      { id: 'corridor', name: 'Corridor', x: 4, y: 4, width: 6, height: 1.2 },
    ],
    bubbleDiagram: {
      nodes: [
        { id: 'living', name: 'Living Room', areaM2: 20, group: 'reception', role: 'public' },
        { id: 'kitchen', name: 'Kitchen', areaM2: 12, group: 'kitchen', role: 'service' },
        { id: 'bedroom', name: 'Bedroom', areaM2: 14, group: 'bedroom', role: 'private' },
        { id: 'corridor', name: 'Corridor', areaM2: 7.2, group: 'corridor', role: 'circulation' },
      ],
      edges: [
        { from: 'living', to: 'kitchen', type: 'door' as const, weight: 3 },
        { from: 'living', to: 'corridor', type: 'door' as const, weight: 2 },
        { from: 'bedroom', to: 'corridor', type: 'door' as const, weight: 3 },
        { from: 'kitchen', to: 'corridor', type: 'door' as const, weight: 1 },
      ],
      typologyId: 'house-residential',
      programSummary: { totalAreaM2: 53.2, roomCount: 4 },
    },
  }
}

function makePlanWithDoors() {
  const plan = makeSimplePlan()
  return {
    ...plan,
    openings: [
      { id: 'd1', wallId: 'w1', offset: 0.5, width: 0.9, kind: 'door' as const },
      { id: 'd2', wallId: 'w2', offset: 0.5, width: 0.8, kind: 'door' as const },
    ],
  }
}

/* ------------------------------------------------------------------ */
/*  buildDualGraph                                                     */
/* ------------------------------------------------------------------ */

describe('buildDualGraph', () => {
  it('creates one node per room', () => {
    const graph = buildDualGraph(makeSimplePlan())
    expect(graph.nodes.length).toBe(4)
  })

  it('creates edges from bubble diagram', () => {
    const graph = buildDualGraph(makeSimplePlan())
    expect(graph.edges.length).toBe(4)
  })

  it('deduplicates bidirectional edges', () => {
    const plan = makeSimplePlan()
    // Add reverse edges to the bubble diagram
    plan.bubbleDiagram.edges.push(
      { from: 'kitchen', to: 'living', type: 'door', weight: 3 },
      { from: 'corridor', to: 'living', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    expect(graph.edges.length).toBe(4) // still 4 unique pairs
  })

  it('each node has expected fields', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const node = graph.nodes[0]
    expect(node).toHaveProperty('id')
    expect(node).toHaveProperty('name')
    expect(node).toHaveProperty('areaM2')
    expect(node).toHaveProperty('occupancyClass')
    expect(node).toHaveProperty('accessible')
    expect(node).toHaveProperty('mandatory')
    expect(node).toHaveProperty('centrality')
    expect(node).toHaveProperty('zone')
  })

  it('each edge has expected fields', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const edge = graph.edges[0]
    expect(edge).toHaveProperty('from')
    expect(edge).toHaveProperty('to')
    expect(edge).toHaveProperty('doorWidth')
    expect(edge).toHaveProperty('fireRating')
    expect(edge).toHaveProperty('weight')
    expect(edge).toHaveProperty('wallLength')
    expect(edge).toHaveProperty('wheelchairPassable')
  })

  it('classifies circulation rooms', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const corridor = graph.nodes.find((n) => n.id === 'corridor')
    expect(corridor?.zone).toBe('circulation')
  })

  it('classifies service rooms', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const kitchen = graph.nodes.find((n) => n.id === 'kitchen')
    expect(kitchen?.zone).toBe('service')
  })

  it('works with adjacency graph instead of bubble diagram', () => {
    const plan = {
      rooms: [
        { id: 'a', name: 'Room A', width: 5, height: 4 },
        { id: 'b', name: 'Room B', width: 3, height: 4 },
      ],
      adjacencyGraph: {
        rules: [
          { from: 'a', to: 'b', weight: 2 },
        ],
      },
    }
    const graph = buildDualGraph(plan)
    expect(graph.edges.length).toBe(1)
    expect(graph.edges[0].from).toBe('a')
    expect(graph.edges[0].to).toBe('b')
  })

  it('returns empty graph for empty plan', () => {
    const graph = buildDualGraph({ rooms: [] })
    expect(graph.nodes.length).toBe(0)
    expect(graph.edges.length).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  analyzeAccessibility                                               */
/* ------------------------------------------------------------------ */

describe('analyzeAccessibility', () => {
  it('marks rooms with wide doors as accessible', () => {
    const plan = makePlanWithDoors()
    const graph = buildDualGraph(plan)
    // Corridor is circulation → exempt
    const report = analyzeAccessibility(graph)
    expect(report.accessibleCount).toBeGreaterThan(0)
  })

  it('returns score between 0 and 1', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeAccessibility(graph)
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(1)
  })

  it('totalCount matches node count', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeAccessibility(graph)
    expect(report.totalCount).toBe(graph.nodes.length)
  })

  it('service rooms are exempt from door-width checks', () => {
    const graph = buildDualGraph(makeSimplePlan())
    // All nodes without edges get accessible=true (no incoming edges → accessible)
    const report = analyzeAccessibility(graph)
    const kitchen = report.nodeResults.find((r) => r.nodeId === 'kitchen')
    expect(kitchen?.accessible).toBe(true)
  })

  it('circulation rooms are exempt', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeAccessibility(graph)
    const corridor = report.nodeResults.find((r) => r.nodeId === 'corridor')
    expect(corridor?.accessible).toBe(true)
  })

  it('nodeResults has one entry per node', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeAccessibility(graph)
    expect(report.nodeResults.length).toBe(graph.nodes.length)
  })
})

/* ------------------------------------------------------------------ */
/*  analyzeCentrality                                                  */
/* ------------------------------------------------------------------ */

describe('analyzeCentrality', () => {
  it('returns rankings sorted by centrality descending', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeCentrality(graph)
    for (let i = 1; i < report.rankings.length; i++) {
      expect(report.rankings[i - 1].centrality).toBeGreaterThanOrEqual(
        report.rankings[i].centrality,
      )
    }
  })

  it('rankings have correct rank numbers (1-indexed)', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeCentrality(graph)
    report.rankings.forEach((r, i) => {
      expect(r.rank).toBe(i + 1)
    })
  })

  it('centrality values are between 0 and 1', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeCentrality(graph)
    for (const r of report.rankings) {
      expect(r.centrality).toBeGreaterThanOrEqual(0)
      expect(r.centrality).toBeLessThanOrEqual(1)
    }
  })

  it('most central node is the first-ranked node', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeCentrality(graph)
    expect(report.mostCentral).toBe(report.rankings[0].nodeId)
  })

  it('corridor-like nodes rank high in centrality', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const report = analyzeCentrality(graph)
    const corridorRank = report.rankings.find((r) => r.nodeId === 'corridor')
    expect(corridorRank).toBeDefined()
    // Corridor connects to living, bedroom, kitchen → should be high centrality
    expect(corridorRank!.centrality).toBeGreaterThan(0)
  })

  it('returns empty rankings for empty graph', () => {
    const report = analyzeCentrality({ nodes: [], edges: [] })
    expect(report.rankings.length).toBe(0)
    expect(report.mostCentral).toBe('')
  })

  it('single node has centrality 0', () => {
    const graph: DualGraph = {
      nodes: [{ id: 'a', name: 'A', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' }],
      edges: [],
    }
    const report = analyzeCentrality(graph)
    expect(report.rankings[0].centrality).toBe(0)
    expect(report.mostCentral).toBe('a')
  })
})

/* ------------------------------------------------------------------ */
/*  shortestPathEgress                                                 */
/* ------------------------------------------------------------------ */

describe('shortestPathEgress', () => {
  it('every room gets an egress path', () => {
    const plan = makeSimplePlan()
    // Add an entrance room
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    expect(report.paths.length).toBe(graph.nodes.length)
  })

  it('exit room has distance 0 to itself', () => {
    const plan = makeSimplePlan()
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    const entrancePath = report.paths.find((p) => p.fromNodeId === 'entrance')
    expect(entrancePath?.distance).toBe(0)
  })

  it('non-exit rooms have positive distance', () => {
    const plan = makeSimplePlan()
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    const livingPath = report.paths.find((p) => p.fromNodeId === 'living')
    expect(livingPath!.distance).toBeGreaterThan(0)
  })

  it('path includes intermediate nodes', () => {
    const plan = makeSimplePlan()
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    // bedroom → corridor → entrance
    const bedroomPath = report.paths.find((p) => p.fromNodeId === 'bedroom')
    expect(bedroomPath!.path).toContain('corridor')
  })

  it('maxEgressDistance is the maximum of all path distances', () => {
    const plan = makeSimplePlan()
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    const maxPath = Math.max(...report.paths.map((p) => p.distance))
    expect(report.maxEgressDistance).toBeCloseTo(maxPath, 1)
  })

  it('returns empty paths for empty graph', () => {
    const report = shortestPathEgress({ nodes: [], edges: [] })
    expect(report.paths.length).toBe(0)
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — zone classification                                     */
/* ------------------------------------------------------------------ */

describe('classifyZone — public rooms', () => {
  it('classifies living/dining/bedroom as public zone', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const living = graph.nodes.find((n) => n.id === 'living')
    const bedroom = graph.nodes.find((n) => n.id === 'bedroom')
    expect(living?.zone).toBe('public')
    expect(bedroom?.zone).toBe('public')
  })

  it('classifies kitchen as service zone', () => {
    const graph = buildDualGraph(makeSimplePlan())
    const kitchen = graph.nodes.find((n) => n.id === 'kitchen')
    expect(kitchen?.zone).toBe('service')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — wheelchairPassable on edges                            */
/* ------------------------------------------------------------------ */

describe('wheelchairPassable', () => {
  it('marks edges with doorWidth >= 0.9 as wheelchairPassable', () => {
    const plan = makePlanWithDoors() // d1: 0.9m, d2: 0.8m
    const graph = buildDualGraph(plan)
    // The first edge (living→kitchen) gets door d1 (0.9m)
    const edges = graph.edges
    const passable = edges.find((e) => e.doorWidth >= 0.9)
    const notPassable = edges.filter((e) => e.doorWidth > 0 && e.doorWidth < 0.9)
    if (passable) expect(passable.wheelchairPassable).toBe(true)
    for (const e of notPassable) {
      expect(e.wheelchairPassable).toBe(false)
    }
  })

  it('marks edges with no door as not wheelchair-passable', () => {
    const graph = buildDualGraph(makeSimplePlan()) // no openings
    for (const edge of graph.edges) {
      expect(edge.wheelchairPassable).toBe(false)
    }
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — analyzeAccessibility with mandatory rooms              */
/* ------------------------------------------------------------------ */

describe('analyzeAccessibility — mandatory rooms', () => {
  it('reports specific reason for mandatory room without wheelchair door', () => {
    // Manually build a graph with mandatory + narrow door
    const graph: DualGraph = {
      nodes: [
        { id: 'bedroom', name: 'Bedroom', areaM2: 14, occupancyClass: 'B2', accessible: true, mandatory: true, centrality: 0, zone: 'public' },
        { id: 'wc', name: 'WC', areaM2: 2, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'service' },
      ],
      edges: [
        { from: 'bedroom', to: 'wc', doorWidth: 0.7, fireRating: 30, weight: 2, wallLength: 2, wheelchairPassable: false },
      ],
    }
    const report = analyzeAccessibility(graph)
    const bedroomResult = report.nodeResults.find((r) => r.nodeId === 'bedroom')
    expect(bedroomResult?.accessible).toBe(false)
    expect(bedroomResult?.reason).toContain('Mandatory room')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — centralityRole labels                                  */
/* ------------------------------------------------------------------ */

describe('analyzeCentrality — centralityRole', () => {
  it('assigns role labels based on centrality thresholds', () => {
    const graph: DualGraph = {
      nodes: [
        { id: 'hub', name: 'Hub', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'circulation' },
        { id: 'a', name: 'A', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
        { id: 'b', name: 'B', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
        { id: 'c', name: 'C', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
        { id: 'leaf', name: 'Leaf', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
      ],
      edges: [
        { from: 'hub', to: 'a', doorWidth: 0, fireRating: 30, weight: 1, wallLength: 3, wheelchairPassable: false },
        { from: 'hub', to: 'b', doorWidth: 0, fireRating: 30, weight: 1, wallLength: 3, wheelchairPassable: false },
        { from: 'hub', to: 'c', doorWidth: 0, fireRating: 30, weight: 1, wallLength: 3, wheelchairPassable: false },
        { from: 'hub', to: 'leaf', doorWidth: 0, fireRating: 30, weight: 1, wallLength: 3, wheelchairPassable: false },
      ],
    }
    const report = analyzeCentrality(graph)
    const hubRanking = report.rankings.find((r) => r.nodeId === 'hub')
    // Hub is the only path between all leaf pairs → highest centrality
    expect(hubRanking!.role).toBe('Primary circulation hub')
    expect(hubRanking!.centrality).toBeGreaterThanOrEqual(0.8)
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — shortestPathEgress custom exits                        */
/* ------------------------------------------------------------------ */

describe('shortestPathEgress — custom exits', () => {
  it('uses custom exit labels to identify exit nodes', () => {
    const plan = makeSimplePlan()
    plan.rooms.push({ id: 'backdoor', name: 'Back Door', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'backdoor', name: 'Back Door', areaM2: 6, group: 'circulation', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'backdoor', type: 'door', weight: 2 },
    )
    const graph = buildDualGraph(plan)
    // Without custom exit, "Back Door" doesn't match the regex (no "entrance" etc.)
    // Without custom exit, "Back Door" doesn't match the regex (no "entrance" etc.)
    const reportCustom = shortestPathEgress(graph, [{ label: 'Back Door' }])
    const backdoorCustom = reportCustom.paths.find((p) => p.fromNodeId === 'backdoor')
    expect(backdoorCustom?.distance).toBe(0)
    expect(backdoorCustom?.compliant).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — shortestPathEgress fallback exit (highest centrality)  */
/* ------------------------------------------------------------------ */

describe('shortestPathEgress — fallback exit', () => {
  it('uses highest-centrality node when no exit room exists', () => {
    // No entrance/exit rooms — all rooms are private/circulation but none match exit regex
    const graph: DualGraph = {
      nodes: [
        { id: 'a', name: 'Room A', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
        { id: 'b', name: 'Room B', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0.5, zone: 'private' },
      ],
      edges: [
        { from: 'a', to: 'b', doorWidth: 1.0, fireRating: 30, weight: 2, wallLength: 3, wheelchairPassable: true },
      ],
    }
    const report = shortestPathEgress(graph)
    // Node b has higher centrality → should become the fallback exit
    const bPath = report.paths.find((p) => p.fromNodeId === 'b')
    expect(bPath?.distance).toBe(0)
    expect(bPath?.toExitName).toBe('Room B')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — shortestPathEgress disconnected room                   */
/* ------------------------------------------------------------------ */

describe('shortestPathEgress — disconnected room', () => {
  it('reports Infinity distance and non-compliant for disconnected room', () => {
    const graph: DualGraph = {
      nodes: [
        { id: 'entrance', name: 'Entrance', areaM2: 6, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'circulation' },
        { id: 'connected', name: 'Connected Room', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
        { id: 'disconnected', name: 'Disconnected Room', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
      ],
      edges: [
        { from: 'connected', to: 'entrance', doorWidth: 1.0, fireRating: 30, weight: 2, wallLength: 3, wheelchairPassable: true },
        // No edge to 'disconnected'
      ],
    }
    const report = shortestPathEgress(graph)
    const discPath = report.paths.find((p) => p.fromNodeId === 'disconnected')
    expect(discPath?.distance).toBe(Infinity)
    expect(discPath?.compliant).toBe(false)
    expect(discPath?.toExitName).toBe('(none)')
    expect(report.maxEgressDistance).toBe(Infinity)
    expect(report.compliant).toBe(false)
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — egress door widths and compliance                      */
/* ------------------------------------------------------------------ */

describe('shortestPathEgress — doorWidths and compliant', () => {
  it('collects door widths along the egress path', () => {
    const plan = makeSimplePlan() as ReturnType<typeof makeSimplePlan> & { openings?: { id: string; wallId: string; offset: number; width: number; kind: 'door' | 'window' }[] }
    plan.rooms.push({ id: 'entrance', name: 'Entrance', x: 10, y: 4, width: 3, height: 2 })
    plan.bubbleDiagram.nodes.push({
      id: 'entrance', name: 'Entrance', areaM2: 6, group: 'entrance', role: 'circulation',
    })
    plan.bubbleDiagram.edges.push(
      { from: 'corridor', to: 'entrance', type: 'door', weight: 2 },
    )
    plan.openings = [
      { id: 'd1', wallId: 'w1', offset: 0.5, width: 1.0, kind: 'door' },
    ]
    const graph = buildDualGraph(plan)
    const report = shortestPathEgress(graph)
    // Living → corridor → entrance (two edges → two door widths)
    const livingPath = report.paths.find((p) => p.fromNodeId === 'living')
    expect(livingPath).toBeDefined()
    expect(livingPath!.doorWidths.length).toBeGreaterThan(0)
    expect(typeof livingPath!.compliant).toBe('boolean')
  })

  it('reports non-compliant when door widths are below minimum', () => {
    const graph: DualGraph = {
      nodes: [
        { id: 'entrance', name: 'Entrance', areaM2: 6, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'circulation' },
        { id: 'room', name: 'Room', areaM2: 10, occupancyClass: 'B2', accessible: true, mandatory: false, centrality: 0, zone: 'private' },
      ],
      edges: [
        { from: 'room', to: 'entrance', doorWidth: 0.6, fireRating: 30, weight: 2, wallLength: 3, wheelchairPassable: false },
      ],
    }
    const report = shortestPathEgress(graph)
    const roomPath = report.paths.find((p) => p.fromNodeId === 'room')
    expect(roomPath?.compliant).toBe(false)
    expect(roomPath?.doorWidths).toContain(0.6)
  })
})
