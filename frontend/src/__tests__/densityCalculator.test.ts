import { describe, it, expect } from 'vitest'
import { computeDensity } from '@/engine/calculators/densityCalculator'

describe('densityCalculator', () => {
  it('computes DU/ha and persons/ha from site area and FAR', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 1.6,
      avgUnitSizeM2: 100,
      efficiency: 0.75,
      householdSize: 3,
      residentialPct: 1.0,
    })
    // GFA = 5000 * 1.6 = 8000
    // residentialGfa = 8000 * 1.0 = 8000
    // netInternalArea = 8000 * 0.75 = 6000
    // dwellingUnits = floor(6000 / 100) = 60
    // population = 60 * 3 = 180
    // netSiteAreaHa = 5000/10000 = 0.5
    // netDensity = 60/0.5 = 120 DU/ha
    // population density = 180/0.5 = 360 persons/ha
    expect(result.dwellingUnits).toBe(60)
    expect(result.netDensityDuPerHa).toBeCloseTo(120, 0)
    expect(result.populationDensityPersonsPerHa).toBeCloseTo(360, 0)
  })

  it('classifies density as medium for high DU/ha', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 1.6,
      avgUnitSizeM2: 100,
      efficiency: 0.75,
      householdSize: 3,
      residentialPct: 1.0,
    })
    // 120 DU/ha falls in Medium density (urban) 75-150
    expect(result.densityClassification).toBe('Medium density (urban)')
  })

  it('classifies density as low for suburban', () => {
    const result = computeDensity({
      siteAreaM2: 10000,
      far: 0.5,
      avgUnitSizeM2: 150,
      efficiency: 0.8,
      householdSize: 2.5,
      residentialPct: 0.8,
    })
    // GFA = 5000, resGFA = 4000, NIA = 3200, DU = 21, density = 21 DU/ha -> Low density (suburban)
    expect(result.densityClassification).toBe('Low density (suburban)')
  })

  it('classifies density as very high for metropolitan core', () => {
    const result = computeDensity({
      siteAreaM2: 2000,
      far: 3.0,
      avgUnitSizeM2: 70,
      efficiency: 0.75,
      householdSize: 3,
      residentialPct: 1.0,
    })
    // GFA = 6000, NIA = 4500, DU = 64, density = 320 DU/ha -> Very high density
    expect(result.densityClassification).toBe('Very high density (metropolitan core)')
  })

  it('computes population from dwelling units and household size (rounded)', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 2.0,
      avgUnitSizeM2: 80,
      efficiency: 0.75,
      householdSize: 3.5,
      residentialPct: 1.0,
    })
    // GFA = 10000, NIA = 7500, DU = 93, pop = Math.round(93 * 3.5) = 326
    expect(result.population).toBe(Math.round(result.dwellingUnits * 3.5))
  })

  it('computes gross density accounting for streets', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 1.5,
      avgUnitSizeM2: 100,
      efficiency: 0.75,
      householdSize: 3,
      residentialPct: 1.0,
      streetsPct: 0.2,
    })
    expect(result.grossDensityDuPerHa).toBeLessThan(result.netDensityDuPerHa)
    expect(result.grossSiteAreaHa).toBeGreaterThan(result.netSiteAreaHa)
  })

  it('handles mixed-use residential percentage', () => {
    const result = computeDensity({
      siteAreaM2: 10000,
      far: 2.0,
      avgUnitSizeM2: 80,
      efficiency: 0.75,
      householdSize: 3,
      residentialPct: 0.5,
    })
    expect(result.residentialGfaM2).toBe(10000)
    expect(result.nonResidentialGfaM2).toBe(10000)
    expect(result.dwellingUnits).toBeGreaterThan(0)
  })

  it('validates site area must be positive', () => {
    const result = computeDensity({
      siteAreaM2: 0,
      far: 1.5,
      avgUnitSizeM2: 85,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('positive')
  })

  it('validates FAR must be positive', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 0,
      avgUnitSizeM2: 85,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('validates average unit size must be positive', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 1.5,
      avgUnitSizeM2: 0,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('validates efficiency must be between 0 and 1', () => {
    const result = computeDensity({
      siteAreaM2: 5000,
      far: 1.5,
      avgUnitSizeM2: 85,
      efficiency: 1.5,
    })
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})