import { describe, it, expect } from 'vitest'
import { generateSchoolLayout } from '@/lib/layout/typologies/school-strategy'
import { getTypology } from '@/engine/typology-kb'

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

describe('generateSchoolLayout', () => {
  it('places all rooms on a realistic plate', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    expect(result.valid).toBe(true)
    expect(result.rooms.length).toBeGreaterThanOrEqual(SCHOOL_PROGRAM.length - 1)
  })

  it('corridor runs full width as a horizontal spine', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    const corridor = result.rooms.find(r => r.name === 'Corridor')
    expect(corridor).toBeDefined()
    expect(corridor!.width).toBeGreaterThanOrEqual(35)
    expect(corridor!.height).toBeCloseTo(1.8, 0)
  })

  it('classrooms are in a row adjacent to the corridor', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    const classrooms = result.rooms.filter(r => r.name.includes('Classroom'))
    expect(classrooms.length).toBe(6)
    for (const cr of classrooms) {
      expect(cr.height).toBeGreaterThan(5)
      expect(cr.width).toBeGreaterThanOrEqual(3)
    }
    const totalClassroomWidth = classrooms.reduce((s, r) => s + r.width, 0)
    expect(totalClassroomWidth).toBeGreaterThanOrEqual(35)
  })

  it('support rooms sit in the lower band of the plate', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    const corridor = result.rooms.find(r => r.name === 'Corridor')!
    const supportNames = ['Library', "Head's Office", 'Staff Room', 'Store']
    for (const name of supportNames) {
      const room = result.rooms.find(r => r.name === name)
      if (room) {
        expect(room.y).toBeLessThanOrEqual(corridor.y)
        expect(room.y + room.height).toBeGreaterThanOrEqual(corridor.y - 1)
      }
    }
  })

  it('has structural grid from KB', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    expect(result.structuralGrid).toBeDefined()
    expect(result.structuralGrid!.spanX).toBeGreaterThan(0)
  })

  it('has bubble diagram', () => {
    const result = generateSchoolLayout(SCHOOL_PROGRAM, 40, 30, 0)
    expect(result.bubbleDiagram).toBeDefined()
    expect(result.bubbleDiagram!.nodes.length).toBeGreaterThanOrEqual(6)
  })

  it('no room escapes the plate boundary', () => {
    const W = 40, H = 30
    const result = generateSchoolLayout(SCHOOL_PROGRAM, W, H, 0)
    for (const r of result.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(-0.1)
      expect(r.y).toBeGreaterThanOrEqual(-0.1)
      expect(r.x + r.width).toBeLessThanOrEqual(W + 0.5)
      expect(r.y + r.height).toBeLessThanOrEqual(H + 0.5)
    }
  })

  it('falls back to template on a tiny plate', () => {
    const tiny = [{ name: 'Classroom 1', areaM2: 42 }, { name: 'Corridor', areaM2: 10 }]
    const result = generateSchoolLayout(tiny, 6, 5, 0)
    expect(result.rooms.length).toBeGreaterThanOrEqual(1)
  })

  it('KB school-classroom entry has expected fields', () => {
    const kb = getTypology('school-classroom')
    expect(kb).toBeDefined()
    expect(kb!.defaultStoreys).toBe(2)
    expect(kb!.maxStructuralSpan).toBe(7.5)
  })
})
