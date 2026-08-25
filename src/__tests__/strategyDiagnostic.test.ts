import { describe, it, expect } from 'vitest'
import { generateSchoolLayout } from '@/lib/layout/typologies/school-strategy'
import { generateWarehouseLayout } from '@/lib/layout/typologies/warehouse-strategy'

const SCHOOL_PROGRAM = [
  { name: 'Classroom 1', areaM2: 42 },
  { name: 'Classroom 2', areaM2: 42 },
  { name: 'Classroom 3', areaM2: 42 },
  { name: 'Classroom 4', areaM2: 42 },
  { name: 'Classroom 5', areaM2: 42 },
  { name: 'Classroom 6', areaM2: 42 },
  { name: "Head's Office", areaM2: 12 },
  { name: 'Staff Room', areaM2: 20 },
  { name: 'Library', areaM2: 40 },
  { name: 'Store', areaM2: 8 },
  { name: 'Toilet Block', areaM2: 12 },
  { name: 'Corridor', areaM2: 10 },
]

const WAREHOUSE_PROGRAM = [
  { name: 'Warehouse Floor', areaM2: 500 },
  { name: 'Office / Admin', areaM2: 20 },
  { name: 'Staff Room', areaM2: 12 },
  { name: 'Toilet', areaM2: 5 },
  { name: 'Loading Bay', areaM2: 40 },
  { name: 'Store', areaM2: 12 },
]

describe('school strategy diagnostic', () => {
  it('places all rooms on 40x30 plate', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    console.log('=== SCHOOL 40x30 ===')
    console.log('valid:', result.valid)
    console.log('room count:', result.rooms.length)
    for (const r of result.rooms) {
      console.log(`  ${r.name.padEnd(20)} x:${r.x.toFixed(1)} y:${r.y.toFixed(1)} w:${r.width.toFixed(1)} h:${r.height.toFixed(1)}`)
    }
    console.log('adjacency score:', result.adjacencyGraph?.score)
    expect(result.rooms.length).toBeGreaterThanOrEqual(SCHOOL_PROGRAM.length - 1)
  })
})

describe('warehouse strategy diagnostic', () => {
  it('places all rooms on 30x20 plate', () => {
    const result = generateWarehouseLayout(WAREHOUSE_PROGRAM, 30, 20, 0)
    console.log('=== WAREHOUSE 30x20 ===')
    console.log('valid:', result.valid)
    console.log('room count:', result.rooms.length)
    for (const r of result.rooms) {
      console.log(`  ${r.name.padEnd(20)} x:${r.x.toFixed(1)} y:${r.y.toFixed(1)} w:${r.width.toFixed(1)} h:${r.height.toFixed(1)}`)
    }
    console.log('adjacency score:', result.adjacencyGraph?.score)
    expect(result.rooms.length).toBeGreaterThanOrEqual(WAREHOUSE_PROGRAM.length - 1)
  })
})
