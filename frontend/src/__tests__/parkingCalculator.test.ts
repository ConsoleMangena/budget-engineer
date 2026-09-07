import { describe, it, expect } from 'vitest'
import { computeParking, type ParkingUseRatio, type ParkingOptions } from '@/engine/calculators/parkingCalculator'

describe('parkingCalculator', () => {
  it('computes office parking at 2.5 per 1000m² (180m² -> 1 space)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 180 },
    ]
    const result = computeParking(useAreas)
    // (180/1000) * 2.5 = 0.45, ceil = 1
    expect(result.grossSpaces).toBe(1)
    expect(result.nonResidentialSpaces).toBe(1)
    expect(result.residentialSpaces).toBe(0)
  })

  it('computes residential parking at 1.0 per 1000m² (120m² -> 1 space)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'residential', areaM2: 120 },
    ]
    const result = computeParking(useAreas)
    // (120/1000) * 1.0 = 0.12, ceil = 1
    expect(result.grossSpaces).toBe(1)
    expect(result.residentialSpaces).toBe(1)
  })

  it('applies transit reduction 20%', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 1000 },
    ]
    const options: ParkingOptions = {
      hasTransit: true,
      transitReduction: 0.2,
    }
    const result = computeParking(useAreas, options)
    // office 1000m²: (1000/1000)*2.5 = 2.5 -> ceil = 3 spaces
    // transit reduction 20% of 3 = 0.6 -> floor = 0
    expect(result.transitReductionSpaces).toBe(0)
    expect(result.netSpacesRounded).toBeLessThanOrEqual(result.grossSpaces)
  })

  it('applies shared parking reduction 10%', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 1000 },
      { use: 'retail', areaM2: 500 },
    ]
    const options: ParkingOptions = {
      hasSharedParking: true,
      sharedReduction: 0.1,
    }
    const result = computeParking(useAreas, options)
    // office: 3 spaces, retail: ceil(500/1000*3) = 2, total = 5
    // shared reduction 10% of 5 = 0.5 -> floor = 0
    expect(result.sharedReductionSpaces).toBe(0)
    expect(result.netSpacesRounded).toBeLessThanOrEqual(result.grossSpaces)
  })

  it('applies TDM reduction 15%', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 1000 },
    ]
    const options: ParkingOptions = {
      tdmReduction: 0.15,
    }
    const result = computeParking(useAreas, options)
    // office 1000m²: 3 spaces, TDM 15% of 3 = 0.45 -> floor = 0
    expect(result.tdmReductionSpaces).toBe(0)
    expect(result.netSpacesRounded).toBeLessThanOrEqual(result.grossSpaces)
  })

  it('combines all reductions transit shared TDM', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 2000 },
    ]
    const options: ParkingOptions = {
      hasTransit: true,
      transitReduction: 0.2,
      hasSharedParking: true,
      sharedReduction: 0.1,
      tdmReduction: 0.15,
    }
    const result = computeParking(useAreas, options)
    // office 2000m²: ceil(2 * 2.5) = 5 spaces
    // transit: 5 * 0.2 = 1, shared: 5 * 0.1 = 0, TDM: 5 * 0.15 = 0
    // total reduction = 1
    expect(result.totalReductionSpaces).toBe(
      result.transitReductionSpaces + result.sharedReductionSpaces + result.tdmReductionSpaces
    )
    expect(result.netSpacesRequired).toBeLessThan(result.grossSpaces)
  })

  it('computes parking area m² at 30m² per space', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'residential', areaM2: 200 },
    ]
    const result = computeParking(useAreas)
    expect(result.parkingAreaM2).toBe(result.netSpacesRounded * 30)
  })

  it('computes construction cost at $100 per m² (parking area * 100)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 150 },
    ]
    const result = computeParking(useAreas)
    expect(result.parkingCost).toBe(result.parkingAreaM2 * 100)
  })

  it('handles mixed use building house + office', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'residential', areaM2: 150 },
      { use: 'office', areaM2: 100 },
    ]
    const result = computeParking(useAreas)
    // residential: ceil(150/1000 * 1) = 1
    // office: ceil(100/1000 * 2.5) = 1
    // total = 2
    expect(result.grossSpaces).toBe(2)
    expect(result.residentialSpaces).toBe(1)
    expect(result.nonResidentialSpaces).toBe(1)
  })

  it('handles retail F1 large shop (3.0 per 1000m²)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'retail', areaM2: 500 },
    ]
    const result = computeParking(useAreas)
    // ceil(500/1000 * 3.0) = ceil(1.5) = 2
    expect(result.grossSpaces).toBe(2)
  })

  it('handles industrial use (0.5 per 1000m²)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'industrial', areaM2: 2000 },
    ]
    const result = computeParking(useAreas)
    // ceil(2000/1000 * 0.5) = ceil(1) = 1
    expect(result.grossSpaces).toBe(1)
  })

  it('handles educational use (1.5 per 1000m²)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'educational', areaM2: 1000 },
    ]
    const result = computeParking(useAreas)
    // ceil(1000/1000 * 1.5) = 2
    expect(result.grossSpaces).toBe(2)
  })

  it('handles institutional use clinic hospital (1.5 per 1000m²)', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'institutional', areaM2: 800 },
    ]
    const result = computeParking(useAreas)
    // ceil(800/1000 * 1.5) = ceil(1.2) = 2
    expect(result.grossSpaces).toBe(2)
  })

  it('validates no use areas provided', () => {
    const result = computeParking([])
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.warnings[0]).toContain('No use areas')
  })

  it('handles unknown use type with default ratio', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'unknown' as any, areaM2: 100 },
    ]
    const result = computeParking(useAreas)
    expect(result.warnings.length).toBeGreaterThan(0)
    expect(result.grossSpaces).toBe(1)
  })

  it('computes parking area in ft²', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 300 },
    ]
    const result = computeParking(useAreas)
    expect(result.parkingAreaFt2).toBeCloseTo(result.parkingAreaM2 * 10.764, 1)
  })

  it('applies carshare spaces', () => {
    const useAreas: ParkingUseRatio[] = [
      { use: 'office', areaM2: 500 },
    ]
    const options: ParkingOptions = {
      carshareSpaces: 3,
    }
    const result = computeParking(useAreas, options)
    // office 500m²: ceil(500/1000 * 2.5) = ceil(1.25) = 2
    // carshare 3 -> net = 2 - 3 = 0 (floored at 0)
    expect(result.carshareSpaces).toBe(3)
    expect(result.netSpacesRounded).toBeLessThanOrEqual(result.grossSpaces)
  })
})