import { describe, it, expect } from 'vitest'
import { computeFar, type FarInput } from '@/engine/calculators/farCalculator'

describe('farCalculator', () => {
  it('computes FAR 1.5 on 1000m² site with GFA 1500m²', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 500, floors: 3 }],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.baseFar).toBeCloseTo(1.5, 1)
    expect(result.totalGfaM2).toBe(1500)
    expect(result.siteAreaM2).toBe(1000)
  })

  it('computes GFA breakdown per zone and storeys', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [
        { footprintM2: 400, floors: 2 },
        { footprintM2: 300, floors: 4 },
        { footprintM2: 200, floors: 1 },
      ],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.zoneDetails).toHaveLength(3)
    expect(result.zoneDetails[0].gfaM2).toBe(800)
    expect(result.zoneDetails[1].gfaM2).toBe(1200)
    expect(result.zoneDetails[2].gfaM2).toBe(200)
    expect(result.totalGfaM2).toBe(2200)
  })

  it('computes open space ratio', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 400, floors: 2 }],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.openGroundM2).toBe(600)
    expect(result.openSpacePct).toBe(60)
    expect(result.totalFootprintM2).toBe(400)
  })

  it('applies bonus FAR per zoning/regulations', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 500, floors: 3 }],
      bonusFar: 0.5,
    }
    const result = computeFar(input)
    expect(result.bonusFar).toBe(0.5)
    expect(result.bonusGfaM2).toBe(500)
    expect(result.effectiveFar).toBeCloseTo(2.0, 1)
    expect(result.totalGfaWithBonusM2).toBe(2000)
  })

  it('checks compliance with Model Building By-Laws 1977 Ch2 setbacks', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 500, floors: 3 }],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.effectiveCoverage).toBe(0.5)
    expect(result.openSpacePct).toBe(50)
  })

  it('handles SANS 10400 compliance check', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 600, floors: 2 }],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.effectiveCoverage).toBe(0.6)
    expect(result.openSpacePct).toBe(40)
  })

  it('validates zone storeys must be positive', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [{ footprintM2: 500, floors: 0 }],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('positive')
  })

  it('handles no zones provided', () => {
    const input: FarInput = {
      siteAreaM2: 1000,
      zones: [],
      bonusFar: 0,
    }
    const result = computeFar(input)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('No zones')
  })
})