export interface StructuralLoadInput {
  area: number
  occupancy?: StructuralOccupancy
  deadLoadOverride?: number
  liveLoadOverride?: number
  tributaryWidthM?: number
  tributaryLengthM?: number
  floors?: number
  windLoadKnm2?: number
  seismicFactor?: number
}

export interface StructuralLoadResult {
  deadLoadKnm2: number
  liveLoadKnm2: number
  totalLoadKnm2: number
  deadLoadTotalKn: number
  liveLoadTotalKn: number
  grandTotalKn: number
  occupancy: StructuralOccupancy
  tributaryLoadKn?: number
  isPreliminary: true
  warnings: string[]
  uls: UlsResult
  preliminaryColumn: ColumnResult
}

export type StructuralOccupancy =
  | 'residential' | 'office' | 'retail' | 'industrial' | 'storage'
  | 'roof' | 'educational' | 'institutional' | 'hospital'
  | 'hotel' | 'library' | 'assembly' | 'parking'

export interface UlsResult {
  gammaG: number
  gammaQ: number
  factoredTotalKn: number
  factoredPerFloorKn: number
  combinations: UlsCombination[]
  governingCase: string
}

export interface UlsCombination {
  label: string
  formula: string
  valueKn: number
}

export interface ColumnResult {
  requiredAgMm2: number
  columnDimMm: number
  concreteStrengthMpa: number
  description: string
}

export const DEAD_LOADS: Record<StructuralOccupancy, number> = {
  residential: 4.0,
  office: 4.0,
  retail: 5.0,
  industrial: 6.0,
  storage: 5.0,
  roof: 2.0,
  educational: 4.5,
  institutional: 4.5,
  hospital: 5.0,
  hotel: 4.5,
  library: 5.0,
  assembly: 5.0,
  parking: 4.5,
}

export const LIVE_LOADS: Record<StructuralOccupancy, number> = {
  residential: 1.92,
  office: 2.40,
  retail: 4.79,
  industrial: 6.0,
  storage: 6.0,
  roof: 1.0,
  educational: 2.40,
  institutional: 2.40,
  hospital: 3.80,
  hotel: 1.92,
  library: 7.20,
  assembly: 4.79,
  parking: 2.40,
}

export const SANS_10160_GAMMA_G = 1.4
export const SANS_10160_GAMMA_Q = 1.6
export const ASCE_7_GAMMA_D = 1.2
export const ASCE_7_GAMMA_L = 1.6
export const DEFAULT_FC_MP = 35
export const MIN_COLUMN_DIM_MM = 300

function computeUlsCombinations(
  deadKn: number,
  liveKn: number,
  totalFloorKn: number,
  floors: number,
  windKn?: number,
  seismicKn?: number,
): UlsResult {
  const combos: UlsCombination[] = [
    {
      label: 'SANS 10160: 1.4G + 1.6Q',
      formula: '1.4G + 1.6Q',
      valueKn: Number(((SANS_10160_GAMMA_G * deadKn + SANS_10160_GAMMA_Q * liveKn) * floors).toFixed(2)),
    },
    {
      label: 'ASCE 7: 1.2D + 1.6L',
      formula: '1.2D + 1.6L',
      valueKn: Number(((ASCE_7_GAMMA_D * deadKn + ASCE_7_GAMMA_L * liveKn) * floors).toFixed(2)),
    },
    {
      label: 'Gravity only: G + Q',
      formula: 'G + Q',
      valueKn: Number(totalFloorKn),
    },
  ]

  if (windKn != null && windKn > 0) {
    combos.push({
      label: 'Wind uplift: 1.2G + 1.6W',
      formula: '1.2G + 1.6W',
      valueKn: Number(((ASCE_7_GAMMA_D * deadKn + 1.6 * windKn) * floors).toFixed(2)),
    })
    combos.push({
      label: 'Wind+Gravity: 1.2G + 1.6Q + 0.5W',
      formula: '1.2G + 1.6Q + 0.5W',
      valueKn: Number(((ASCE_7_GAMMA_D * deadKn + ASCE_7_GAMMA_L * liveKn + 0.5 * windKn) * floors).toFixed(2)),
    })
  }

  if (seismicKn != null && seismicKn > 0) {
    combos.push({
      label: 'Seismic: 1.2G + 1.0E',
      formula: '1.2G + 1.0E',
      valueKn: Number(((ASCE_7_GAMMA_D * deadKn + seismicKn) * floors).toFixed(2)),
    })
    combos.push({
      label: 'Seismic+Gravity: 1.2G + 1.0Q + 0.2E',
      formula: '1.2G + 1.0Q + 0.2E',
      valueKn: Number(((ASCE_7_GAMMA_D * deadKn + liveKn + 0.2 * seismicKn) * floors).toFixed(2)),
    })
  }

  const governing = combos.reduce((max, c) => (c.valueKn > max.valueKn ? c : max), combos[0])
  const gammaG = SANS_10160_GAMMA_G
  const gammaQ = SANS_10160_GAMMA_Q
  const factoredTotalKn = Number(((gammaG * deadKn + gammaQ * liveKn) * floors).toFixed(2))
  const factoredPerFloorKn = Number((gammaG * deadKn + gammaQ * liveKn).toFixed(2))

  return {
    gammaG,
    gammaQ,
    factoredTotalKn,
    factoredPerFloorKn,
    combinations: combos,
    governingCase: governing.label,
  }
}

function sizeColumn(factoredKn: number, fcPrime: number = DEFAULT_FC_MP): ColumnResult {
  const factoredN = factoredKn * 1000
  const agRequired = factoredN / (0.4 * fcPrime)
  let dim = Math.ceil(Math.sqrt(agRequired) / 50) * 50
  dim = Math.max(dim, MIN_COLUMN_DIM_MM)

  return {
    requiredAgMm2: Math.round(agRequired),
    columnDimMm: dim,
    concreteStrengthMpa: fcPrime,
    description: `~${dim}x${dim} mm RC (fc'=${fcPrime.toFixed(0)} MPa)`,
  }
}

export function computeGravityLoads(input: StructuralLoadInput): StructuralLoadResult {
  const warnings: string[] = []

  const occupancy = input.occupancy ?? 'residential'

  if (input.area < 0) {
    warnings.push('Area is negative; using absolute value')
  }
  const area = Math.abs(input.area)

  const deadLoadKnm2 = input.deadLoadOverride ?? DEAD_LOADS[occupancy]
  const liveLoadKnm2 = input.liveLoadOverride ?? LIVE_LOADS[occupancy]

  if (deadLoadKnm2 < 0) {
    warnings.push('Dead load override is negative; using default')
  }
  if (liveLoadKnm2 < 0) {
    warnings.push('Live load override is negative; using default')
  }

  const safeDead = deadLoadKnm2 >= 0 ? deadLoadKnm2 : DEAD_LOADS[occupancy]
  const safeLive = liveLoadKnm2 >= 0 ? liveLoadKnm2 : LIVE_LOADS[occupancy]

  const totalLoadKnm2 = Number((safeDead + safeLive).toFixed(2))

  const floorCount = input.floors ?? 1
  const totalFloorArea = area * Math.max(1, floorCount)

  const deadLoadTotalKn = Number((safeDead * totalFloorArea).toFixed(2))
  const liveLoadTotalKn = Number((safeLive * totalFloorArea).toFixed(2))
  const grandTotalKn = Number((deadLoadTotalKn + liveLoadTotalKn).toFixed(2))

  let tributaryLoadKn: number | undefined
  if (input.tributaryWidthM != null && input.tributaryLengthM != null) {
    if (input.tributaryWidthM > 0 && input.tributaryLengthM > 0) {
      const tribArea = input.tributaryWidthM * input.tributaryLengthM
      tributaryLoadKn = Number((tribArea * totalLoadKnm2).toFixed(2))
    } else {
      warnings.push('Tributary dimensions must be positive; skipping tributary load')
    }
  }

  if (area === 0) {
    warnings.push('Area is zero; all loads are zero')
  }

  const windKn = input.windLoadKnm2 != null && input.windLoadKnm2 > 0
    ? input.windLoadKnm2 * area
    : undefined
  const seismicKn = input.seismicFactor != null && input.seismicFactor > 0
    ? input.seismicFactor * (safeDead + safeLive * 0.5) * area
    : undefined

  const uls = computeUlsCombinations(
    deadLoadTotalKn,
    liveLoadTotalKn,
    grandTotalKn,
    1,
    windKn,
    seismicKn,
  )

  const preliminaryColumn = sizeColumn(uls.factoredTotalKn)

  warnings.push('This is a PRELIMINARY structural load estimate — not a stamped engineering design')

  return {
    deadLoadKnm2: safeDead,
    liveLoadKnm2: safeLive,
    totalLoadKnm2,
    deadLoadTotalKn,
    liveLoadTotalKn,
    grandTotalKn,
    occupancy,
    tributaryLoadKn,
    isPreliminary: true,
    warnings,
    uls,
    preliminaryColumn,
  }
}

export const DEFAULTS = { DEAD_LOADS, LIVE_LOADS, SANS_10160_GAMMA_G, SANS_10160_GAMMA_Q, ASCE_7_GAMMA_D, ASCE_7_GAMMA_L } as const
