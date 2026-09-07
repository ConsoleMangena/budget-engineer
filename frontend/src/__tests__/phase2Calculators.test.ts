import { describe, it, expect } from 'vitest'
import {
  computeGravityLoads,
  SANS_10160_GAMMA_G,
  SANS_10160_GAMMA_Q,
  ASCE_7_GAMMA_D,
  ASCE_7_GAMMA_L,
  MIN_COLUMN_DIM_MM,
  DEFAULT_FC_MP,
  type StructuralOccupancy,
} from '@/engine/calculators/structuralLoad'
import {
  computeFarDerivation,
  computeSetbacks,
  computeBuildingEnvelope,
} from '@/engine/calculators/areaSchedule'

describe('computeGravityLoads — ULS upgrade', () => {
  it('computes SANS 10160 factored load (1.4G + 1.6Q)', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'residential', floors: 1 })
    const dead = 4.0 * 100
    const live = 1.92 * 100
    const expected = SANS_10160_GAMMA_G * dead + SANS_10160_GAMMA_Q * live
    expect(r.uls.factoredTotalKn).toBeCloseTo(expected, 0)
    expect(r.uls.gammaG).toBe(SANS_10160_GAMMA_G)
    expect(r.uls.gammaQ).toBe(SANS_10160_GAMMA_Q)
  })

  it('includes ASCE 7 combo (1.2D + 1.6L)', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'office', floors: 2 })
    const asce = r.uls.combinations.find((c) => c.formula === '1.2D + 1.6L')
    expect(asce).toBeDefined()
    const dead = 4.0 * 100 * 2
    const live = 2.4 * 100 * 2
    expect(asce!.valueKn).toBeCloseTo(ASCE_7_GAMMA_D * dead + ASCE_7_GAMMA_L * live, 0)
  })

  it('governing case is the highest combo', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'industrial', floors: 3 })
    const values = r.uls.combinations.map((c) => c.valueKn)
    const max = Math.max(...values)
    expect(r.uls.factoredTotalKn).toBeCloseTo(max, 0)
  })

  it('adds wind combination when windLoadKnm2 is provided', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'residential', floors: 1, windLoadKnm2: 0.8 })
    const wind = r.uls.combinations.find((c) => c.formula === '1.2G + 1.6W')
    expect(wind).toBeDefined()
    expect(wind!.valueKn).toBeCloseTo((ASCE_7_GAMMA_D * 4.0 + 1.6 * 0.8) * 100, 0)
  })

  it('adds wind+gravity combination', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'office', floors: 1, windLoadKnm2: 1.0 })
    const combo = r.uls.combinations.find((c) => c.formula === '1.2G + 1.6Q + 0.5W')
    expect(combo).toBeDefined()
    const dead = 4.0 * 100
    const live = 2.4 * 100
    expect(combo!.valueKn).toBeCloseTo((ASCE_7_GAMMA_D * dead + ASCE_7_GAMMA_L * live + 0.5 * 1.0 * 100), 0)
  })

  it('adds seismic combinations when seismicFactor is provided', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'residential', floors: 2, seismicFactor: 0.3 })
    const seismic = r.uls.combinations.find((c) => c.formula === '1.2G + 1.0E')
    expect(seismic).toBeDefined()
    expect(seismic!.valueKn).toBeGreaterThan(0)
  })

  it('sizes preliminary column from factored load', () => {
    const r = computeGravityLoads({ area: 36, occupancy: 'office', floors: 8 })
    expect(r.preliminaryColumn.columnDimMm).toBeGreaterThanOrEqual(MIN_COLUMN_DIM_MM)
    expect(r.preliminaryColumn.concreteStrengthMpa).toBe(DEFAULT_FC_MP)
    expect(r.preliminaryColumn.requiredAgMm2).toBeGreaterThan(0)
    expect(r.preliminaryColumn.description).toContain('mm RC')
  })

  it('does not add wind/seismic combos when those are zero or absent', () => {
    const r = computeGravityLoads({ area: 100, occupancy: 'residential', floors: 1 })
    const wind = r.uls.combinations.find((c) => c.formula.includes('W'))
    const seismic = r.uls.combinations.find((c) => c.formula.includes('E'))
    expect(wind).toBeUndefined()
    expect(seismic).toBeUndefined()
  })

  it('supports all new occupancy types', () => {
    const newTypes: StructuralOccupancy[] = ['hospital', 'hotel', 'library', 'assembly', 'parking']
    for (const occ of newTypes) {
      const r = computeGravityLoads({ area: 100, occupancy: occ })
      expect(r.occupancy).toBe(occ)
      expect(r.deadLoadKnm2).toBeGreaterThan(0)
      expect(r.liveLoadKnm2).toBeGreaterThan(0)
      expect(r.uls.factoredTotalKn).toBeGreaterThan(0)
    }
  })
})

describe('computeFarDerivation', () => {
  it('derives GFA from site area × FAR', () => {
    const rooms = [{ name: 'Living', area: 30 }, { name: 'Kitchen', area: 15 }]
    const result = computeFarDerivation({ siteAreaM2: 1000, far: 2.0, rooms })
    expect(result.farDerivation).toBeDefined()
    expect(result.farDerivation!.totalGfaM2).toBe(2000)
    expect(result.grossFloorArea).toBe(2000)
  })

  it('distributes rooms within derived GFA', () => {
    const rooms = [{ name: 'A', area: 20 }, { name: 'B', area: 30 }]
    const result = computeFarDerivation({ siteAreaM2: 500, far: 3.0, rooms })
    expect(result.netUsableArea).toBe(50)
    expect(result.grossFloorArea).toBe(1500)
  })

  it('warns on zero site area', () => {
    const result = computeFarDerivation({ siteAreaM2: 0, far: 2.0, rooms: [] })
    expect(result.warnings.some((w) => w.includes('Site area'))).toBe(true)
  })
})

describe('computeSetbacks', () => {
  it('applies ZBC default setbacks', () => {
    const result = computeSetbacks({ siteWidthM: 20, siteDepthM: 30, jurisdiction: 'zimbabwe' })
    expect(result.frontM).toBe(6)
    expect(result.rearM).toBe(3)
    expect(result.sideM).toBe(1.5)
    expect(result.buildableWidthM).toBe(17)
    expect(result.buildableDepthM).toBe(21)
    expect(result.buildableAreaM2).toBeCloseTo(357, 0)
  })

  it('applies SA defaults', () => {
    const result = computeSetbacks({ siteWidthM: 20, siteDepthM: 30, jurisdiction: 'south-africa' })
    expect(result.frontM).toBe(5)
    expect(result.rearM).toBe(3)
    expect(result.sideM).toBe(2)
    expect(result.buildableWidthM).toBe(16)
    expect(result.buildableDepthM).toBe(22)
  })

  it('honors explicit overrides', () => {
    const result = computeSetbacks({ siteWidthM: 20, siteDepthM: 30, frontM: 8, rearM: 4, sideM: 2 })
    expect(result.frontM).toBe(8)
    expect(result.rearM).toBe(4)
    expect(result.sideM).toBe(2)
    expect(result.buildableWidthM).toBe(16)
    expect(result.buildableDepthM).toBe(18)
  })

  it('computes coverage percentage', () => {
    const result = computeSetbacks({ siteWidthM: 20, siteDepthM: 30 })
    expect(result.coveragePct).toBeGreaterThan(0)
    expect(result.coveragePct).toBeLessThanOrEqual(100)
  })
})

describe('computeBuildingEnvelope', () => {
  it('computes envelope from GFA and floors', () => {
    const result = computeBuildingEnvelope({ grossFloorAreaM2: 1000, floors: 2 })
    expect(result.floorAreaM2).toBe(500)
    expect(result.wallAreaM2).toBeGreaterThan(0)
    expect(result.roofAreaM2).toBeCloseTo(500, 0)
    expect(result.windowAreaM2).toBeGreaterThan(0)
    expect(result.totalEnvelopeAreaM2).toBeGreaterThan(result.wallAreaM2)
  })

  it('computes wall-to-floor ratio', () => {
    const result = computeBuildingEnvelope({ grossFloorAreaM2: 500, floors: 1 })
    expect(result.wallToFloorRatio).toBeGreaterThan(0)
  })

  it('respects custom storey height and window percent', () => {
    const result = computeBuildingEnvelope({
      grossFloorAreaM2: 1000,
      floors: 2,
      storeyHeightM: 4.0,
      windowToWallPct: 0.35,
    })
    expect(result.assumedStoreyHeightM).toBe(4.0)
    expect(result.assumedWindowToWallPct).toBe(0.35)
  })
})
