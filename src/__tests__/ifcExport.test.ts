import { describe, it, expect } from 'vitest'
import {
  planModelToIfcStep,
  resolveUseTypeForBuilding,
  designPopulationForPlan,
  ifcSpaceLongName,
  formatFireRating,
  type IfcDesignContext,
} from '../engine/architecture/ifcExport'
import type { PlanModel } from '../domain/plan'

/* ------------------------------------------------------------------ */
/*  Fixture builder                                                    */
/* ------------------------------------------------------------------ */

function makePlan(overrides?: Partial<PlanModel>): PlanModel {
  return {
    id: 'plan-test-1',
    designOptionId: 'opt-1',
    width: 8,
    height: 7.5,
    wallThickness: 0.23,
    scaleLabel: '1:100',
    rooms: [
      { id: 'r1', name: 'Living Room', x: 0, y: 0, width: 5, height: 4 },
      { id: 'r2', name: 'Kitchen', x: 5, y: 0, width: 3, height: 4 },
      { id: 'r3', name: 'Bedroom', x: 0, y: 4, width: 4, height: 3.5 },
    ],
    walls: [
      {
        id: 'w-ext-1',
        start: { x: 0, y: 0 },
        end: { x: 8, y: 0 },
        type: 'external',
        thickness: 0.23,
      },
      {
        id: 'w-int-1',
        start: { x: 5, y: 0 },
        end: { x: 5, y: 4 },
        type: 'internal',
        thickness: 0.115,
      },
      {
        id: 'w-ext-2',
        start: { x: 0, y: 7.5 },
        end: { x: 4, y: 7.5 },
        type: 'external',
        thickness: 0.23,
      },
    ],
    openings: [],
    ...overrides,
  }
}

const CTX: IfcDesignContext = {
  buildingType: 'house',
  storeys: 1,
  projectName: 'Test House',
  siteName: 'Test Site',
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('formatFireRating', () => {
  it('240 → "4HR"', () => expect(formatFireRating(240)).toBe('4HR'))
  it('120 → "2HR"', () => expect(formatFireRating(120)).toBe('2HR'))
  it('60 → "1HR"', () => expect(formatFireRating(60)).toBe('1HR'))
  it('30 → "0.5HR"', () => expect(formatFireRating(30)).toBe('0.5HR'))
  it('15 → "NONE"', () => expect(formatFireRating(15)).toBe('NONE'))
  it('0 → "NONE"', () => expect(formatFireRating(0)).toBe('NONE'))
})

describe('resolveUseTypeForBuilding', () => {
  it('house → residential', () => expect(resolveUseTypeForBuilding('house')).toBe('residential'))
  it('townhouse → residential', () => expect(resolveUseTypeForBuilding('townhouse')).toBe('residential'))
  it('office → business', () => expect(resolveUseTypeForBuilding('office')).toBe('business'))
  it('school → educational', () => expect(resolveUseTypeForBuilding('school-classroom')).toBe('educational'))
  it('church → assembly-less-concentrated', () => expect(resolveUseTypeForBuilding('church')).toBe('assembly-less-concentrated'))
  it('shop → mercantile', () => expect(resolveUseTypeForBuilding('retail-shop')).toBe('mercantile'))
  it('hotel → residential', () => expect(resolveUseTypeForBuilding('hotel')).toBe('residential'))
  it('warehouse → storage', () => expect(resolveUseTypeForBuilding('warehouse')).toBe('storage'))
  it('factory → industrial', () => expect(resolveUseTypeForBuilding('factory')).toBe('industrial'))
  it('clinic → institutional', () => expect(resolveUseTypeForBuilding('clinic')).toBe('institutional'))
  it('restaurant → mercantile', () => expect(resolveUseTypeForBuilding('restaurant')).toBe('mercantile'))
  it('unknown → residential (default)', () => expect(resolveUseTypeForBuilding('xyzzy')).toBe('residential'))
  it('undefined → residential', () => expect(resolveUseTypeForBuilding()).toBe('residential'))
})

describe('ifcSpaceLongName', () => {
  it('formats name + area', () => {
    expect(ifcSpaceLongName({ name: 'Living Room', width: 5, height: 4 })).toBe('Living Room 20.0m²')
  })
  it('handles decimal area', () => {
    expect(ifcSpaceLongName({ name: 'Bedroom', width: 3.3, height: 4.1 })).toBe('Bedroom 13.5m²')
  })
})

describe('designPopulationForPlan', () => {
  it('computes occupant load from total room area', () => {
    const plan = makePlan()
    const pop = designPopulationForPlan(plan, 'residential')
    // Total area = 5*4 + 3*4 + 4*3.5 = 20 + 12 + 14 = 46 m²
    // residential load factor = 18.6 → ceil(46/18.6) = ceil(2.47) = 3
    expect(pop).toBe(3)
  })

  it('uses buildingType when useType omitted', () => {
    const plan = makePlan()
    const pop = designPopulationForPlan(plan)
    // buildingType defaults to 'residential' via useTypeForBuildingType()
    expect(pop).toBeGreaterThan(0)
  })
})

describe('planModelToIfcStep', () => {
  it('returns null for empty plan', () => {
    expect(planModelToIfcStep(makePlan({ rooms: [], walls: [], openings: [] }))).toBeNull()
  })

  it('contains IFC4 header', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    expect(ifc).toContain("FILE_DESCRIPTION(('Budget Engineer OS IFC4 export'),'2;1')")
    expect(ifc).toContain("FILE_SCHEMA(('IFC4'))")
    expect(ifc).toContain('ISO-10303-21;')
    expect(ifc).toContain('END-ISO-10303-21;')
  })

  it('emits correct IFCSPACE count (one per room)', () => {
    const plan = makePlan()
    const ifc = planModelToIfcStep(plan, CTX)!
    const spaceCount = (ifc.match(/IFCSPACE\(/g) || []).length
    expect(spaceCount).toBe(plan.rooms.length)
  })

  it('each IFCSPACE has correct 9-parameter format', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    const spaces = ifc.match(/IFCSPACE\([^)]+\)/g) || []
    expect(spaces.length).toBeGreaterThan(0)
    for (const space of spaces) {
      // IFCSPACE(Guid, OwnerHistory, Name, Desc, ObjType, Placement, Rep, CompositionType, Area)
      // = 9 comma-separated items
      const inner = space.slice(space.indexOf('(') + 1, space.lastIndexOf(')'))
      const parts = inner.split(',')
      expect(parts.length).toBe(9)
      expect(parts[7]).toBe('.ELEMENT.')
    }
  })

  it('emits correct IFCWALLSTANDARDCASE count', () => {
    const plan = makePlan()
    const ifc = planModelToIfcStep(plan, CTX)!
    const wallCount = (ifc.match(/IFCWALLSTANDARDCASE\(/g) || []).length
    expect(wallCount).toBe(plan.walls.length)
  })

  it('external walls get .EXTERNAL. predefined type', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    const lines = ifc.split('\n')
    const wallLines = lines.filter((l) => l.includes('IFCWALLSTANDARDCASE('))
    expect(wallLines.length).toBe(3)
    const extWalls = wallLines.filter((l) => l.includes('.EXTERNAL.'))
    const intWalls = wallLines.filter((l) => l.includes('.INTERNAL.'))
    expect(extWalls.length).toBe(2)
    expect(intWalls.length).toBe(1)
  })

  it('emits Pset_SpaceCommon for each room with OccupancyClass and DesignPopulation', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    // house → classifyOccupancy('house') → 'B2' (residential dwelling)
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('OccupancyClass',$,IFCTEXT('B2'),$)")
    // At least one DesignPopulation property
    expect(ifc).toContain("'DesignPopulation'")
    expect(ifc).toContain('IFCREAL(')
    expect(ifc).toContain("'FireCompartment'")
  })

  it('emits Pset_WallCommon with FireRating and material Reference', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    // house → fireRatingMinForClass(B2) = 30 → "0.5HR"
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('FireRating',$,IFCTEXT('0.5HR'),$)")
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('Reference',$,IFCTEXT('Common Brick 7 MPa SAZ 70'),$)")
  })

  it('emits IFCRELCONTAINEDINSPATIALSTRUCTURE with all space refs', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    const lines = ifc.split('\n')
    const containedLine = lines.find((l) => l.includes('IFCRELCONTAINEDINSPATIALSTRUCTURE('))
    expect(containedLine).toBeTruthy()
    if (containedLine) {
      // The line has format: IFCRELCONTAINEDINSPATIALSTRUCTURE('guid',#oh,$,$,(#s1,#s2,#s3),#storey)
      // Extract the ref list inside (...)
      const refListMatch = containedLine.match(/\((#\d+(?:,#\d+)*)\)/)
      expect(refListMatch).toBeTruthy()
      if (refListMatch) {
        const refs = refListMatch[1].split(',')
        expect(refs.length).toBe(3) // 3 rooms = 3 space refs
      }
    }
  })

  it('emits IFCRELSPACEBOUNDARY for bubble diagram edges', () => {
    const plan = makePlan({
      bubbleDiagram: {
        nodes: [
          { id: 'r1', name: 'Living Room', areaM2: 20, group: 'reception', role: 'public' },
          { id: 'r2', name: 'Kitchen', areaM2: 12, group: 'kitchen', role: 'service' },
          { id: 'r3', name: 'Bedroom', areaM2: 14, group: 'bedroom', role: 'private' },
        ],
        edges: [
          { from: 'Living Room', to: 'Kitchen', type: 'door' },
          { from: 'Living Room', to: 'Bedroom', type: 'door', weight: 2 },
        ],
        typologyId: 'house-residential',
        programSummary: { totalAreaM2: 46, roomCount: 3 },
      },
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    const boundaries = ifc.match(/IFCRELSPACEBOUNDARY\(/g) || []
    expect(boundaries.length).toBe(2)
    // weight 2 edge gets .PHYSICAL., weight undefined (0) gets .INTERNAL.
    expect(ifc).toContain('.PHYSICAL.')
    expect(ifc).toContain('.INTERNAL.')
  })

  it('emits owner-history chain (IFCPERSON → IFCORGANIZATION → IFCOWNERHISTORY)', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    expect(ifc).toContain("IFCPERSON($,$,'Budget Engineer',$,$,$,$,$)")
    expect(ifc).toContain("IFCORGANIZATION($,'Budget Engineer OS',$,$,$)")
    expect(ifc).toContain('IFCPERSONANDORGANIZATION(')
    expect(ifc).toContain('IFCAPPLICATION(')
    expect(ifc).toContain('IFCOWNERHISTORY(')
  })

  it('emits spatial hierarchy (PROJECT → SITE → BUILDING → STOREY)', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    expect(ifc).toContain('IFCPROJECT(')
    expect(ifc).toContain('IFCSITE(')
    expect(ifc).toContain('IFCBUILDING(')
    expect(ifc).toContain('IFCBUILDINGSTOREY(')
    expect(ifc).toContain('IFCRELAGGREGATES(')
  })

  it('emits units (SIUNIT for metre, square metre, cubic metre)', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    expect(ifc).toContain('.LENGTHUNIT.,$,.METRE.')
    expect(ifc).toContain('.AREAUNIT.,$,.SQUARE_METRE.')
    expect(ifc).toContain('.VOLUMEUNIT.,$,.CUBIC_METRE.')
  })

  it('emits IFCDOOR for door openings', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-int-1', kind: 'door', offset: 0.5, width: 0.9, height: 2.1 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    expect(ifc).toContain('IFCDOOR(')
    expect(ifc).toContain('.DOOR.')
    expect(ifc).toContain('IFCPOSITIVELENGTHMEASURE(0.9)')
    expect(ifc).toContain('IFCPOSITIVELENGTHMEASURE(2.1)')
  })

  it('emits IFCWINDOW for window openings', () => {
    const plan = makePlan({
      openings: [
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2, height: 1.2, sillHeight: 0.9 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    expect(ifc).toContain('IFCWINDOW(')
    expect(ifc).toContain('.WINDOW.')
    expect(ifc).toContain('IFCPOSITIVELENGTHMEASURE(1.2)')
  })

  it('emits IFCOPENINGELEMENT and IFCRELVOIDSELEMENT per opening', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-int-1', kind: 'door', offset: 0.5, width: 0.9 },
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    const openingCount = (ifc.match(/IFCOPENINGELEMENT\(/g) || []).length
    const voidsCount = (ifc.match(/IFCRELVOIDSELEMENT\(/g) || []).length
    expect(openingCount).toBe(2)
    expect(voidsCount).toBe(2)
  })

  it('emits Pset_DoorCommon with FireRating', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-ext-1', kind: 'door', offset: 0.5, width: 0.9, height: 2.1 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    // House → B2 → fireRating 30 → "0.5HR"
    expect(ifc).toContain("'DoorCommon'")
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('FireRating',$,IFCTEXT('0.5HR'),$)")
  })

  it('emits Pset_WindowCommon with SillHeight', () => {
    const plan = makePlan({
      openings: [
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2, height: 1.2, sillHeight: 0.9 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    expect(ifc).toContain("'WindowCommon'")
    expect(ifc).toContain("'SillHeight'")
  })

  it('contains doors and windows in IFCRELCONTAINEDINSPATIALSTRUCTURE', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-int-1', kind: 'door', offset: 0.5, width: 0.9 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    const containedLines = (ifc.match(/IFCRELCONTAINEDINSPATIALSTRUCTURE\(/g) || []).length
    // One for spaces + one for the door+opening pair
    expect(containedLines).toBeGreaterThanOrEqual(2)
  })

  it('uses default door height 2.1 when height omitted', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-int-1', kind: 'door', offset: 0.5, width: 0.9 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    expect(ifc).toContain('IFCPOSITIVELENGTHMEASURE(2.1)')
  })

  it('uses default window height 1.2 when height omitted', () => {
    const plan = makePlan({
      openings: [
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    expect(ifc).toContain('IFCPOSITIVELENGTHMEASURE(1.2)')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — context defaults                                       */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — context defaults', () => {
  it('uses default projectName when ctx omitted', () => {
    const ifc = planModelToIfcStep(makePlan())!
    expect(ifc).toContain("FILE_NAME('Budget Engineer Project.ifc'")
    expect(ifc).toContain("IFCBUILDING(")
    // Building name defaults to projectName = 'Budget Engineer Project'
    expect(ifc).toContain("'Budget Engineer Project'")
  })

  it('uses default siteName when ctx omitted', () => {
    const ifc = planModelToIfcStep(makePlan())!
    expect(ifc).toContain("IFCSITE(")
    expect(ifc).toContain("'Site'")
  })

  it('uses custom projectName from ctx', () => {
    const ifc = planModelToIfcStep(makePlan(), { projectName: 'My House' })!
    expect(ifc).toContain("FILE_NAME('My House.ifc'")
    expect(ifc).toContain("'My House'")
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — office building type                                   */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — office building type', () => {
  it('uses E1 occupancy class and 1HR fire rating for office', () => {
    const officeCtx: IfcDesignContext = {
      buildingType: 'office-commercial',
      storeys: 1,
      projectName: 'Office Test',
    }
    const ifc = planModelToIfcStep(makePlan(), officeCtx)!
    // office-commercial → classifyOccupancy → E1 → fireRatingMinForClass(60) → 1HR
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('OccupancyClass',$,IFCTEXT('E1'),$)")
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('FireRating',$,IFCTEXT('1HR'),$)")
  })

  it('resolveUseTypeForBuilding returns business for office-commercial', () => {
    expect(resolveUseTypeForBuilding('office-commercial')).toBe('business')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — adjacency graph fallback                               */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — adjacency graph fallback', () => {
  it('emits IFCRELSPACEBOUNDARY from adjacencyGraph when no bubbleDiagram', () => {
    const plan = makePlan({
      adjacencyGraph: {
        rules: [
          { from: 'r1', to: 'r2', weight: 3 },
          { from: 'r1', to: 'r3', weight: 1 },
        ],
        satisfiedWeight: 0,
        totalWeight: 4,
        score: 0,
        satisfied: [],
        violated: [],
        edges: [],
      },
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    const boundaries = ifc.match(/IFCRELSPACEBOUNDARY\(/g) || []
    expect(boundaries.length).toBe(2)
    // weight >= 2 → .PHYSICAL., weight < 2 → .INTERNAL.
    expect(ifc).toContain('.PHYSICAL.')
    expect(ifc).toContain('.INTERNAL.')
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — daylight factor per zone                               */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — daylight factor', () => {
  it('public rooms get DaylightFactor 2.0', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    // Living Room is public zone → daylightFactorForZone returns 2.0
    expect(ifc).toContain("IFCPROPERTYSINGLEVALUE('DaylightFactor',$,IFCREAL(2),$)")
  })

  it('service rooms get DaylightFactor 1.0', () => {
    const ifc = planModelToIfcStep(makePlan(), CTX)!
    // Kitchen is service zone → daylightFactorForZone returns 1.0
    // Both public (2.0) and service (1.0) are present
    expect(ifc).toContain("IFCREAL(2)")
    expect(ifc).toContain("IFCREAL(1)")
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — window default sillHeight                              */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — window sillHeight default', () => {
  it('window without sillHeight gets 0.9 default', () => {
    const plan = makePlan({
      openings: [
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2, height: 1.2 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    // SillHeight 0.9 should appear in the WindowCommon pset
    expect(ifc).toContain("'SillHeight'")
    expect(ifc).toContain("IFCREAL(0.9)")
  })
})

/* ------------------------------------------------------------------ */
/*  Gap tests — multiple openings (door + window combined)             */
/* ------------------------------------------------------------------ */

describe('planModelToIfcStep — multiple openings', () => {
  it('emits both IFCDOOR and IFCWINDOW with correct counts', () => {
    const plan = makePlan({
      openings: [
        { id: 'door-1', wallId: 'w-int-1', kind: 'door', offset: 0.5, width: 0.9, height: 2.1 },
        { id: 'door-2', wallId: 'w-int-1', kind: 'door', offset: 0.8, width: 0.8, height: 2.1 },
        { id: 'win-1', wallId: 'w-ext-1', kind: 'window', offset: 0.3, width: 1.2, height: 1.2, sillHeight: 0.9 },
      ],
    })
    const ifc = planModelToIfcStep(plan, CTX)!
    const doorCount = (ifc.match(/IFCDOOR\(/g) || []).length
    const windowCount = (ifc.match(/IFCWINDOW\(/g) || []).length
    const openingCount = (ifc.match(/IFCOPENINGELEMENT\(/g) || []).length
    const voidsCount = (ifc.match(/IFCRELVOIDSELEMENT\(/g) || []).length
    expect(doorCount).toBe(2)
    expect(windowCount).toBe(1)
    expect(openingCount).toBe(3)
    expect(voidsCount).toBe(3)
  })
})
