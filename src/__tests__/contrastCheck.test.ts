import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  relativeLuminance,
  contrastRatio,
  checkContrast,
} from '@/lib/image-tools/contrastCheck'

describe('hexToRgb', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgb('#1a365d')).toEqual([26, 54, 93])
  })

  it('parses 3-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255])
  })

  it('handles missing hash', () => {
    expect(hexToRgb('000000')).toEqual([0, 0, 0])
  })
})

describe('relativeLuminance', () => {
  it('returns 1 for white', () => {
    expect(relativeLuminance(255, 255, 255)).toBeCloseTo(1.0, 2)
  })

  it('returns 0 for black', () => {
    expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0.0, 2)
  })

  it('returns expected luminance for brand navy', () => {
    const lum = relativeLuminance(26, 54, 93)
    expect(lum).toBeGreaterThan(0)
    expect(lum).toBeLessThan(0.1)
  })
})

describe('contrastRatio', () => {
  it('returns 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21)
  })

  it('returns 1:1 for same color', () => {
    expect(contrastRatio('#808080', '#808080')).toBe(1)
  })

  it('is commutative', () => {
    const r1 = contrastRatio('#1a365d', '#ffffff')
    const r2 = contrastRatio('#ffffff', '#1a365d')
    expect(r1).toBe(r2)
  })
})

describe('checkContrast', () => {
  it('checks all pairs from 3 colors', () => {
    const result = checkContrast(['#000', '#fff', '#888'])
    expect(result.pairs).toHaveLength(3)
    expect(result.summary.totalPairs).toBe(3)
  })

  it('passes AA for black on white', () => {
    const result = checkContrast(['#000000', '#ffffff'])
    expect(result.pairs[0].aa.normal).toBe(true)
    expect(result.pairs[0].aaa.normal).toBe(true)
    expect(result.summary.passAA).toBe(1)
  })

  it('fails AA for low-contrast pair', () => {
    const result = checkContrast(['#cccccc', '#dddddd'])
    expect(result.pairs[0].aa.normal).toBe(false)
    expect(result.summary.failAA).toBe(1)
  })

  it('handles colors without hash prefix', () => {
    const result = checkContrast(['000000', 'ffffff'])
    expect(result.pairs).toHaveLength(1)
    expect(result.pairs[0].ratio).toBe(21)
  })
})
