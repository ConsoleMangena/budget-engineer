import { describe, it, expect } from 'vitest'
import {
  extractConstraintsFromText,
  extractConstraintsFromChunks,
} from '@/engine/rag/constraints'
import type { TextChunk } from '@/engine/rag/types'

describe('extractConstraintsFromText', () => {
  describe('min operator', () => {
    it('extracts "minimum of X" with m unit', () => {
      const r = extractConstraintsFromText('Minimum of 2.4m ceiling height')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('min')
      expect(r[0].rule.value).toBe(2.4)
      expect(r[0].rule.unit).toBe('m')
    })
    it('extracts "at least X"', () => {
      const r = extractConstraintsFromText('Room must be at least 10m²')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('min')
      expect(r[0].rule.value).toBe(10)
      expect(r[0].rule.unit).toBe('m²')
    })
    it('extracts "not less than X"', () => {
      const r = extractConstraintsFromText('Wall thickness not less than 230mm')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('min')
      expect(r[0].rule.value).toBe(230)
      expect(r[0].rule.unit).toBe('mm')
    })
    it('extracts "X minimum"', () => {
      const r = extractConstraintsFromText('The width should be 900mm minimum')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('min')
      expect(r[0].rule.value).toBe(900)
      expect(r[0].rule.unit).toBe('mm')
    })
  })

  describe('max operator', () => {
    it('extracts "maximum of X"', () => {
      const r = extractConstraintsFromText('Maximum of 45m travel distance')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('max')
      expect(r[0].rule.value).toBe(45)
      expect(r[0].rule.unit).toBe('m')
    })
    it('extracts "shall not exceed X"', () => {
      const r = extractConstraintsFromText('Load shall not exceed 2.5kPa')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('max')
      expect(r[0].rule.value).toBe(2.5)
    })
    it('extracts "no more than X" (unit picks up "m" from next word)', () => {
      const r = extractConstraintsFromText('No more than 60 minutes fire resistance')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('max')
      expect(r[0].rule.value).toBe(60)
    })
    it('extracts "X maximum"', () => {
      const r = extractConstraintsFromText('Rise height 175mm maximum')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('max')
      expect(r[0].rule.value).toBe(175)
      expect(r[0].rule.unit).toBe('mm')
    })
  })

  describe('eq operator', () => {
    it('extracts "exactly X"', () => {
      const r = extractConstraintsFromText('Door opening exactly 900mm')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('eq')
      expect(r[0].rule.value).toBe(900)
    })
    it('extracts "shall be X"', () => {
      const r = extractConstraintsFromText('The gap shall be 10mm')
      expect(r.length).toBeGreaterThanOrEqual(1)
      expect(r[0].rule.operator).toBe('eq')
      expect(r[0].rule.value).toBe(10)
    })
  })

  describe('unit normalization', () => {
    it('normalizes % and percent', () => {
      const r1 = extractConstraintsFromText('Glazing ratio minimum of 10%')
      expect(r1[0].rule.unit).toBe('%')
      const r2 = extractConstraintsFromText('Glazing ratio minimum of 10 percent')
      expect(r2[0].rule.unit).toBe('%')
    })
    it('normalizes m², sqm, sq m', () => {
      expect(extractConstraintsFromText('Area minimum of 5m²')[0].rule.unit).toBe('m²')
      expect(extractConstraintsFromText('Area minimum of 5sqm')[0].rule.unit).toBe('m²')
      expect(extractConstraintsFromText('Area minimum of 5sq m')[0].rule.unit).toBe('m²')
    })
    it('normalizes kPa', () => {
      expect(extractConstraintsFromText('Pressure maximum of 100kPa')[0].rule.unit).toBe('kPa')
    })
    it('passes through hours, days, seconds', () => {
      expect(extractConstraintsFromText('Duration minimum of 2 hours')[0].rule.unit).toBe('hours')
      expect(extractConstraintsFromText('Duration minimum of 7 days')[0].rule.unit).toBe('days')
    })
  })

  describe('category classification', () => {
    it('classifies ceiling → ceiling-height', () => {
      expect(extractConstraintsFromText('Minimum ceiling height of 2.4m')[0].rule.category).toBe('ceiling-height')
    })
    it('classifies room → room-area', () => {
      expect(extractConstraintsFromText('Habitable room minimum area of 10m²')[0].rule.category).toBe('room-area')
    })
    it('classifies setback → setback', () => {
      expect(extractConstraintsFromText('Setback minimum of 3m from boundary')[0].rule.category).toBe('setback')
    })
    it('classifies travel → egress', () => {
      expect(extractConstraintsFromText('Travel distance maximum of 45m')[0].rule.category).toBe('egress')
    })
    it('classifies ventilation → ventilation', () => {
      expect(extractConstraintsFromText('Ventilation minimum of 5m²')[0].rule.category).toBe('ventilation')
    })
    it('classifies window → daylight', () => {
      expect(extractConstraintsFromText('Window glazing minimum of 10%')[0].rule.category).toBe('daylight')
    })
    it('classifies stair → stair', () => {
      expect(extractConstraintsFromText('Stair rise maximum of 175mm')[0].rule.category).toBe('stair')
    })
    it('defaults to general', () => {
      expect(extractConstraintsFromText('Some general minimum of 5')[0].rule.category).toBe('general')
    })
  })

  describe('edge cases', () => {
    it('returns empty array for text with no constraints', () => {
      expect(extractConstraintsFromText('No numbers here at all.')).toEqual([])
    })
    it('returns empty for empty text', () => {
      expect(extractConstraintsFromText('')).toEqual([])
    })
    it('extracts multiple constraints from one paragraph', () => {
      const r = extractConstraintsFromText('Minimum of 2.4m height and maximum of 45m travel')
      expect(r.length).toBeGreaterThanOrEqual(2)
    })
    it('clauseRef is passed through', () => {
      const r = extractConstraintsFromText('Minimum of 2.4m', 'by-laws:sec-4-1')
      expect(r[0].clauseRef).toBe('by-laws:sec-4-1')
    })
  })
})

describe('extractConstraintsFromChunks', () => {
  it('processes multiple chunks', () => {
    const chunks: TextChunk[] = [
      { id: '1', docId: 'd', sectionId: 's1', heading: '', path: [], text: 'Minimum of 2.4m ceiling' },
      { id: '2', docId: 'd', sectionId: 's2', heading: '', path: [], text: 'Maximum of 45m travel' },
    ]
    const r = extractConstraintsFromChunks(chunks)
    expect(r.length).toBeGreaterThanOrEqual(2)
    expect(r.some((c) => c.rule.operator === 'min')).toBe(true)
    expect(r.some((c) => c.rule.operator === 'max')).toBe(true)
  })
  it('returns empty for empty chunks', () => {
    expect(extractConstraintsFromChunks([])).toEqual([])
  })
})
