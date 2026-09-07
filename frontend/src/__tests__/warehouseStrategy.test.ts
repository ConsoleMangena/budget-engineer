import { describe, it, expect } from 'vitest'
import { generateWarehouseLayout } from '@/lib/layout/typologies/warehouse-strategy'
import { getTypology } from '@/engine/typology-kb'

const WAREHOUSE_PROGRAM = [
  { name: 'Warehouse Floor', areaM2: 500 },
  { name: 'Office / Admin', areaM2: 20 },
  { name: 'Staff Room', areaM2: 12 },
  { name: 'Toilet', areaM2: 5 },
  { name: 'Loading Bay', areaM2: 40 },
  { name: 'Store', areaM2: 12 },
]

describe('generateWarehouseLayout', () => {
  it('places all rooms within the plate', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBeGreaterThanOrEqual(WAREHOUSE_PROGRAM.length - 1)
  })

  it('warehouse floor is the dominant clear span', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    const wh = result.rooms.find(r => r.name.includes('Warehouse'))
    expect(wh).toBeDefined()
    const whArea = wh!.width * wh!.height
    const totalArea = 30 * 20
    expect(whArea / totalArea).toBeGreaterThan(0.5)
  })

  it('loading bay is a full-width band at the front', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    const lb = result.rooms.find(r => r.name.includes('Loading'))
    expect(lb).toBeDefined()
    expect(lb!.width).toBeGreaterThanOrEqual(25)
    expect(lb!.height).toBeGreaterThanOrEqual(3)
  })

  it('support rooms are in a narrow strip', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    const office = result.rooms.find(r => r.name.includes('Office'))
    const staff = result.rooms.find(r => r.name.includes('Staff'))
    const store = result.rooms.find(r => r.name.includes('Store'))
    if (office) expect(office.width).toBeLessThanOrEqual(5)
    if (staff) expect(staff.width).toBeLessThanOrEqual(5)
    if (store) expect(store.width).toBeLessThanOrEqual(5)
  })

  it('corridor is a narrow vertical strip', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    const corridor = result.rooms.find(r => r.name === 'Corridor')
    expect(corridor).toBeDefined()
    expect(corridor!.width).toBeLessThanOrEqual(2.5)
    expect(corridor!.height).toBeGreaterThanOrEqual(10)
  })

  it('no room escapes the plate boundary', () => {
    const W = 30, H = 20
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, W, H, 0)
    for (const r of result.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(-0.1)
      expect(r.y).toBeGreaterThanOrEqual(-0.1)
      expect(r.x + r.width).toBeLessThanOrEqual(W + 0.5)
      expect(r.y + r.height).toBeLessThanOrEqual(H + 0.5)
    }
  })

  it('has structural grid from KB', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    expect(result.structuralGrid).toBeDefined()
    expect(result.structuralGrid!.spanX).toBeGreaterThan(0)
  })

  it('has bubble diagram with warehouse rooms', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    expect(result.bubbleDiagram).toBeDefined()
    expect(result.bubbleDiagram!.nodes.length).toBeGreaterThanOrEqual(5)
  })

  it('mezzanine floor context produces strip layout', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0, { levelIndex: 1, floorRole: 'mezzanine-office', isGround: false, totalFloors: 2, isRoof: false, programmeTags: [] })
    expect(result.rooms.length).toBe(WAREHOUSE_PROGRAM.length)
  })

  it('falls back to template on a tiny plate', () => {
    const tiny = [{ name: 'Warehouse Floor', areaM2: 100 }]
    const result = generateWarehouseLayout(tiny, 8, 6, 0)
    expect(result.rooms.length).toBeGreaterThanOrEqual(1)
  })

  it('KB warehouse-industrial entry has expected fields', () => {
    const kb = getTypology('warehouse-industrial')
    expect(kb).toBeDefined()
    expect(kb!.defaultStoreys).toBe(1)
    expect(kb!.maxStructuralSpan).toBe(20)
  })
})
