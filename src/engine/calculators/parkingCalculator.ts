export type ParkingUse = 'residential' | 'office' | 'retail' | 'industrial' | 'educational' | 'institutional'

export interface ParkingUseRatio {
  use: ParkingUse
  areaM2: number
}

export interface ParkingOptions {
  hasTransit?: boolean
  transitReduction?: number
  hasSharedParking?: boolean
  sharedReduction?: number
  tdmReduction?: number
  carshareSpaces?: number
}

export interface ParkingResult {
  grossSpaces: number
  residentialSpaces: number
  nonResidentialSpaces: number
  transitReductionSpaces: number
  sharedReductionSpaces: number
  tdmReductionSpaces: number
  carshareSpaces: number
  totalReductionSpaces: number
  netSpacesRequired: number
  netSpacesRounded: number
  parkingAreaM2: number
  parkingAreaFt2: number
  parkingCost: number
  overridesUsed: string[]
  warnings: string[]
}

export const PARKING_RATIOS: Record<ParkingUse, number> = {
  residential: 1.0,
  office: 2.5,
  retail: 3.0,
  industrial: 0.5,
  educational: 1.5,
  institutional: 1.5,
}

export const PARKING_AREA_PER_SPACE_M2 = 30

export function computeParking(
  useAreas: ParkingUseRatio[],
  options: ParkingOptions = {},
): ParkingResult {
  const warnings: string[] = []
  const overridesUsed: string[] = []

  if (useAreas.length === 0) {
    warnings.push('No use areas provided')
    return emptyResult(warnings)
  }

  const invalidUse = useAreas.find((u) => !PARKING_RATIOS[u.use])
  if (invalidUse) {
    warnings.push(`Unknown use type "${invalidUse.use}"; using default ratio`)
  }

  let grossSpaces = 0
  let residentialSpaces = 0
  let nonResidentialSpaces = 0

  for (const { use, areaM2 } of useAreas) {
    const ratio = PARKING_RATIOS[use] ?? 1.0
    const spaces = Math.max(0, Math.ceil((areaM2 / 1000) * ratio))
    grossSpaces += spaces
    if (use === 'residential') {
      residentialSpaces += spaces
    } else {
      nonResidentialSpaces += spaces
    }
  }

  if (grossSpaces === 0) {
    warnings.push('Total area produces zero parking spaces')
    return emptyResult(warnings)
  }

  const {
    hasTransit = false,
    transitReduction = 0.25,
    hasSharedParking = false,
    sharedReduction = 0.2,
    tdmReduction = 0,
    carshareSpaces = 0,
  } = options

  let transitReduced = 0
  let sharedReduced = 0
  let tdmReduced = 0

  if (hasTransit) {
    transitReduced = Math.floor(grossSpaces * Math.max(0, Math.min(1, transitReduction)))
    if (transitReduction !== 0.25) {
      overridesUsed.push(`transit reduction ${transitReduction * 100}%`)
    }
  }

  if (hasSharedParking) {
    sharedReduced = Math.floor(grossSpaces * Math.max(0, Math.min(1, sharedReduction)))
    if (sharedReduction !== 0.2) {
      overridesUsed.push(`shared reduction ${sharedReduction * 100}%`)
    }
  }

  if (tdmReduction > 0) {
    tdmReduced = Math.floor(grossSpaces * Math.max(0, Math.min(1, tdmReduction)))
    if (tdmReduction !== 0.15) {
      overridesUsed.push(`TDM reduction ${tdmReduction * 100}%`)
    }
  }

  const totalReduction = transitReduced + sharedReduced + tdmReduced
  const safeCarshare = Math.max(0, Math.floor(carshareSpaces))
  const netSpaces = Math.max(0, grossSpaces - totalReduction - safeCarshare)
  const netRounded = Math.ceil(netSpaces)

  const parkingArea = netRounded * PARKING_AREA_PER_SPACE_M2
  const parkingAreaFt2 = parkingArea * 10.764
  const parkingCost = parkingArea * 100

  return {
    grossSpaces,
    residentialSpaces,
    nonResidentialSpaces,
    transitReductionSpaces: transitReduced,
    sharedReductionSpaces: sharedReduced,
    tdmReductionSpaces: tdmReduced,
    carshareSpaces: safeCarshare,
    totalReductionSpaces: totalReduction,
    netSpacesRequired: netSpaces,
    netSpacesRounded: netRounded,
    parkingAreaM2: parkingArea,
    parkingAreaFt2: Number(parkingAreaFt2.toFixed(1)),
    parkingCost,
    overridesUsed,
    warnings,
  }
}

function emptyResult(warnings: string[]): ParkingResult {
  return {
    grossSpaces: 0,
    residentialSpaces: 0,
    nonResidentialSpaces: 0,
    transitReductionSpaces: 0,
    sharedReductionSpaces: 0,
    tdmReductionSpaces: 0,
    carshareSpaces: 0,
    totalReductionSpaces: 0,
    netSpacesRequired: 0,
    netSpacesRounded: 0,
    parkingAreaM2: 0,
    parkingAreaFt2: 0,
    parkingCost: 0,
    overridesUsed: [],
    warnings,
  }
}
