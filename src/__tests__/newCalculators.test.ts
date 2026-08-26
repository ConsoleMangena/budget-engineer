import { describe, it, expect } from 'vitest'
import { computeFar } from '@/engine/calculators/farCalculator'
import { computeDensity } from '@/engine/calculators/densityCalculator'
import { computeParking, PARKING_RATIOS, PARKING_AREA_PER_SPACE_M2 } from '@/engine/calculators/parkingCalculator'

describe('computeFar', () => {
  it('computes GFA and FAR from uniform zones with coverage', () => {
    const result = computeFar({ siteAreaM2: 1000, zones: [{ floors: 3 }, { floors: 3 }] })
    expect(result.siteAreaM2).toBe(1000)
    expect(result.numZones).toBe(2)
    expect(result.totalFootprintM2).toBe(600)
    expect(result.effectiveCoverage).toBeCloseTo(0.6, 1)
    expect(result.totalGfaM2).toBe(1800)
    expect(result.baseFar).toBeCloseTo(1.8, 1)
  })

  it('handles explicit footprints per zone', () => {
    const result = computeFar({
      siteAreaM2: 2000,
      zones: [
        { floors: 2, footprintM2: 500 },
        { floors: 4, footprintM2: 300 },
      ],
    })
    expect(result.zoneDetails[0].gfaM2).toBe(1000)
    expect(result.zoneDetails[1].gfaM2).toBe(1200)
    expect(result.totalGfaM2).toBe(2200)
    expect(result.effectiveCoverage).toBeCloseTo(0.4, 1)
  })

  it('adds bonus FAR', () => {
    const result = computeFar({ siteAreaM2: 1000, zones: [{ floors: 2 }], bonusFar: 0.5 })
    expect(result.bonusGfaM2).toBe(500)
    expect(result.effectiveFar).toBeCloseTo(1.7, 1)
    expect(result.totalGfaWithBonusM2).toBeCloseTo(1700, 0)
  })

  it('applies use-split breakdown', () => {
    const result = computeFar({
      siteAreaM2: 1000,
      zones: [{ floors: 3 }],
      useSplit: { retail: 30, residential: 70 },
    })
    expect(result.useBreakdownM2['retail']).toBeCloseTo(540, 0)
    expect(result.useBreakdownM2['residential']).toBeCloseTo(1260, 0)
  })

  it('warns when use-split sums to != 100%', () => {
    const result = computeFar({
      siteAreaM2: 1000,
      zones: [{ floors: 2 }],
      useSplit: { retail: 30, residential: 50 },
    })
    expect(result.warnings.some((w) => w.includes('100%'))).toBe(true)
  })

  it('returns warnings for zero site area', () => {
    const result = computeFar({ siteAreaM2: 0, zones: [{ floors: 3 }] })
    expect(result.totalGfaM2).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('returns warnings for empty zones', () => {
    const result = computeFar({ siteAreaM2: 1000, zones: [] })
    expect(result.numZones).toBe(0)
    expect(result.warnings.some((w) => w.includes('No zones'))).toBe(true)
  })

  it('returns warnings for invalid floor count', () => {
    const result = computeFar({ siteAreaM2: 1000, zones: [{ floors: 0 }] })
    expect(result.warnings.some((w) => w.includes('floor count'))).toBe(true)
  })

  it('computes open ground area correctly', () => {
    const result = computeFar({ siteAreaM2: 1000, zones: [{ floors: 1 }] })
    expect(result.openGroundM2).toBeCloseTo(400, 0)
    expect(result.openSpacePct).toBeCloseTo(40, 0)
  })
})

describe('computeDensity', () => {
  it('computes dwelling units and population from FAR', () => {
    const result = computeDensity({
      siteAreaM2: 10_000,
      far: 2.0,
      avgUnitSizeM2: 85,
      householdSize: 2.5,
      residentialPct: 0.7,
      efficiency: 0.75,
    })
    expect(result.totalGfaM2).toBe(20_000)
    expect(result.residentialGfaM2).toBe(14_000)
    expect(result.nonResidentialGfaM2).toBe(6000)
    expect(result.dwellingUnits).toBe(123)
    expect(result.population).toBe(308)
  })

  it('computes net and gross density', () => {
    const result = computeDensity({
      siteAreaM2: 20_000,
      far: 3.0,
      avgUnitSizeM2: 100,
      householdSize: 3,
      residentialPct: 0.8,
    })
    expect(result.netDensityDuPerHa).toBeGreaterThan(0)
    expect(result.grossDensityDuPerHa).toBeGreaterThan(0)
    expect(result.grossDensityDuPerHa).toBeLessThan(result.netDensityDuPerHa)
  })

  it('classifies density correctly', () => {
    expect(computeDensity({ siteAreaM2: 10_000, far: 0.3 }).densityClassification).toBe('Low density (suburban)')
    expect(computeDensity({ siteAreaM2: 10_000, far: 2.0 }).densityClassification).toBe('Medium density (urban)')
    expect(computeDensity({ siteAreaM2: 10_000, far: 15.0 }).densityClassification).toBe('Very high density (metropolitan core)')
  })

  it('warns for zero site area', () => {
    const result = computeDensity({ siteAreaM2: 0, far: 2.0 })
    expect(result.dwellingUnits).toBe(0)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('warns for zero FAR', () => {
    const result = computeDensity({ siteAreaM2: 10_000, far: 0 })
    expect(result.warnings.some((w) => w.includes('positive'))).toBe(true)
  })

  it('handles streetsPct reducing gross area', () => {
    const net = computeDensity({ siteAreaM2: 10_000, far: 2.0, streetsPct: 0 })
    const gross = computeDensity({ siteAreaM2: 10_000, far: 2.0, streetsPct: 0.3 })
    expect(gross.grossSiteAreaM2).toBeGreaterThan(net.grossSiteAreaM2)
    expect(gross.grossDensityDuPerHa).toBeLessThan(gross.netDensityDuPerHa)
  })
})

describe('computeParking', () => {
  it('computes spaces from residential area', () => {
    const result = computeParking([{ use: 'residential', areaM2: 5000 }])
    expect(result.grossSpaces).toBe(5)
    expect(result.residentialSpaces).toBe(5)
  })

  it('applies different ratios per use type', () => {
    const office = computeParking([{ use: 'office', areaM2: 10_000 }])
    const industrial = computeParking([{ use: 'industrial', areaM2: 10_000 }])
    expect(office.grossSpaces).toBe(25)
    expect(industrial.grossSpaces).toBe(5)
  })

  it('applies transit reduction', () => {
    const result = computeParking(
      [{ use: 'office', areaM2: 10_000 }],
      { hasTransit: true },
    )
    expect(result.transitReductionSpaces).toBe(6)
    expect(result.netSpacesRounded).toBe(19)
  })

  it('applies shared parking reduction', () => {
    const result = computeParking(
      [{ use: 'office', areaM2: 10_000 }],
      { hasSharedParking: true },
    )
    expect(result.sharedReductionSpaces).toBe(5)
  })

  it('applies TDM reduction', () => {
    const result = computeParking(
      [{ use: 'retail', areaM2: 6000 }],
      { tdmReduction: 0.2 },
    )
    expect(result.tdmReductionSpaces).toBe(3)
  })

  it('deducts carshare spaces', () => {
    const result = computeParking(
      [{ use: 'residential', areaM2: 10_000 }],
      { carshareSpaces: 3 },
    )
    expect(result.carshareSpaces).toBe(3)
    expect(result.netSpacesRounded).toBe(7)
  })

  it('computes parking area and cost', () => {
    const result = computeParking([{ use: 'office', areaM2: 10_000 }])
    expect(result.parkingAreaM2).toBe(25 * PARKING_AREA_PER_SPACE_M2)
    expect(result.parkingCost).toBe(result.parkingAreaM2 * 100)
  })

  it('warns for empty input', () => {
    const result = computeParking([])
    expect(result.grossSpaces).toBe(0)
    expect(result.warnings.some((w) => w.includes('No use areas'))).toBe(true)
  })

  it('uses default ratios when ratios table is checked', () => {
    expect(PARKING_RATIOS.residential).toBe(1.0)
    expect(PARKING_RATIOS.office).toBe(2.5)
    expect(PARKING_RATIOS.retail).toBe(3.0)
  })
})
