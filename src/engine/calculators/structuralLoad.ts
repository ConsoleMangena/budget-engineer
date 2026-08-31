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
  wallLengthM?: number
  wallHeightM?: number
  wallThicknessM?: number
  brickDensityKgM3?: number
  wallCount?: number
  spanM?: number
  columnCount?: number
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
  wallSelfWeightKn?: number
  wallLoadKnm2?: number
  columnSizing?: ColumnSizingResult
  lateralStability?: LateralStabilityResult
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

export interface ColumnSizingResult {
  totalAxialLoadKn: number
  columnCount: number
  loadPerColumnKn: number
  requiredAgMm2: number
  columnDimMm: number
  concreteStrengthMpa: number
  columnSpacingM: number
  spanM: number
  spacingCompliant: boolean
  description: string
}

export interface LateralStabilityResult {
  baseShearKn: number
  overturningMomentKnM: number
  resistingMomentKnM: number
  stabilityRatio: number
  compliant: boolean
  method: 'portal-frame' | 'shear-wall' | 'braced-frame'
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

// Brick properties per SANS 10400 / SABS 227 / SAZ 7 MPa Common Brick
export const BRICK_DENSITY_KG_M3 = 1800
export const BRICK_COMPRESSIVE_MPA = 7
export const BRICK_WIDTH_M = 0.23
export const BRICK_HEIGHT_M = 2.4
export const GRAVITY_MS2 = 9.81

// Span table per Skills-Architects structural systems (typical residential/commercial)
export const COLUMN_SPACING_TABLE: Record<string, { maxSpanM: number; minColDimMm: number }> = {
  residential: { maxSpanM: 5.0, minColDimMm: 300 },
  office: { maxSpanM: 7.5, minColDimMm: 400 },
  office_long: { maxSpanM: 9.0, minColDimMm: 450 },
  retail: { maxSpanM: 6.0, minColDimMm: 350 },
  industrial: { maxSpanM: 9.0, minColDimMm: 500 },
  storage: { maxSpanM: 7.5, minColDimMm: 400 },
}

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

// Calculate wall self-weight for masonry walls per SANS 10400 / SABS 227
// Common Brick 7 MPa, density 1800 kg/m³, width 0.23m, height 2.4m per floor
function calculateWallSelfWeight(input: StructuralLoadInput): { wallSelfWeightKn: number; wallLoadKnm2: number } {
  const wallLengthM = input.wallLengthM ?? 0
  const wallHeightM = input.wallHeightM ?? BRICK_HEIGHT_M
  const wallThicknessM = input.wallThicknessM ?? BRICK_WIDTH_M
  const brickDensity = input.brickDensityKgM3 ?? BRICK_DENSITY_KG_M3
  const wallCount = input.wallCount ?? 1
  const floorsVal = input.floors ?? 1

  if (wallLengthM <= 0) {
    return { wallSelfWeightKn: 0, wallLoadKnm2: 0 }
  }

  const wallVolumeM3 = wallLengthM * wallHeightM * wallThicknessM * wallCount * floorsVal
  const wallMassKg = wallVolumeM3 * brickDensity
  const wallSelfWeightKn = Number((wallMassKg * GRAVITY_MS2 / 1000).toFixed(2))
  const wallLoadKnm2 = wallSelfWeightKn > 0 && input.area > 0
    ? Number((wallSelfWeightKn / input.area).toFixed(2))
    : 0

  return { wallSelfWeightKn, wallLoadKnm2 }
}

// Column sizing per Skills-Architects structural systems span tables
function sizeColumnsPerSpanTable(
  factoredLoadPerColumnKn: number,
  spanM: number,
  occupancy: StructuralOccupancy,
  fcPrime: number = DEFAULT_FC_MP
): ColumnSizingResult {
  const tableEntry = COLUMN_SPACING_TABLE[occupancy] ?? COLUMN_SPACING_TABLE.residential
  const maxSpanM = tableEntry.maxSpanM
  const minColDimMm = tableEntry.minColDimMm

  const factoredN = factoredLoadPerColumnKn * 1000
  const agRequired = factoredN / (0.4 * fcPrime)
  let dim = Math.ceil(Math.sqrt(agRequired) / 50) * 50
  dim = Math.max(dim, minColDimMm, MIN_COLUMN_DIM_MM)

  const spacingCompliant = spanM <= maxSpanM

  return {
    totalAxialLoadKn: factoredLoadPerColumnKn,
    columnCount: 1,
    loadPerColumnKn: factoredLoadPerColumnKn,
    requiredAgMm2: Math.round(factoredN / (0.4 * fcPrime)),
    columnDimMm: dim,
    concreteStrengthMpa: fcPrime,
    columnSpacingM: spanM,
    spanM,
    spacingCompliant,
    description: spacingCompliant
      ? `~${dim}x${dim} mm RC (fc'=${fcPrime.toFixed(0)} MPa) - span ${spanM}m <= ${maxSpanM}m OK`
      : `~${dim}x${dim} mm RC (fc'=${fcPrime.toFixed(0)} MPa) - span ${spanM}m EXCEEDS ${maxSpanM}m`,
  }
}

// Lateral stability check per SANS 10160 / SANS 10400
function checkLateralStability(
  totalHorizontalLoadKn: number,
  buildingHeightM: number,
  buildingWidthM: number,
  buildingDepthM: number
): LateralStabilityResult {
  // Base shear per SANS 10160-3 (simplified for low-rise)
  // V = C * W, where C depends on zone and building type
  const baseShearKn = totalHorizontalLoadKn

  // Overturning moment at base
  const overturningMomentKnM = baseShearKn * (buildingHeightM / 2)

  // Resisting moment from dead load (simplified)
  // Assume rectangular building, weight distributed
  const deadLoadPerM2 = 4.0 // typical residential dead load kN/m²
  const buildingAreaM2 = buildingWidthM * buildingDepthM
  const totalDeadLoadKn = deadLoadPerM2 * buildingAreaM2 * (buildingHeightM / 3.0) // 3m per floor
  const leverArmM = Math.min(buildingWidthM, buildingDepthM) / 2
  const resistingMomentKnM = totalDeadLoadKn * leverArmM

  const stabilityRatio = resistingMomentKnM / Math.max(0.001, overturningMomentKnM)
  const compliant = stabilityRatio >= 1.5 // SANS 10160 requires >= 1.5

  return {
    baseShearKn: Number(baseShearKn.toFixed(2)),
    overturningMomentKnM: Number(overturningMomentKnM.toFixed(2)),
    resistingMomentKnM: Number(resistingMomentKnM.toFixed(2)),
    stabilityRatio: Number(stabilityRatio.toFixed(2)),
    compliant,
    method: 'shear-wall',
    description: compliant
      ? `Stability ratio ${stabilityRatio.toFixed(2)} >= 1.5 OK (shear wall)`
      : `Stability ratio ${stabilityRatio.toFixed(2)} < 1.5 FAIL (shear wall)`,
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
    floorCount,
    windKn,
    seismicKn,
  )

  // Calculate wall self-weight
  const { wallSelfWeightKn, wallLoadKnm2 } = calculateWallSelfWeight(input)

  // Column sizing per span table
  let columnSizing: ColumnSizingResult | undefined
  if (input.spanM != null && input.spanM > 0 && input.columnCount != null && input.columnCount > 0) {
    const loadPerColumnKn = uls.factoredTotalKn / input.columnCount
    const colSizing = sizeColumnsPerSpanTable(loadPerColumnKn, input.spanM, occupancy)
    columnSizing = colSizing
  }

  // Lateral stability check
  let lateralStability: LateralStabilityResult | undefined
  if (input.wallLengthM != null && input.wallLengthM > 0 && input.wallThicknessM != null) {
    const lateralStabilityResult = checkLateralStability(
      input.windLoadKnm2 ?? 0,
      (input.floors ?? 1) * BRICK_HEIGHT_M,
      Math.sqrt(area),
      Math.sqrt(area)
    )
    lateralStability = lateralStabilityResult
  }

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
    wallSelfWeightKn,
    wallLoadKnm2,
    columnSizing,
    lateralStability,
  }
}

export const DEFAULTS = {
  DEAD_LOADS,
  LIVE_LOADS,
  SANS_10160_GAMMA_G,
  SANS_10160_GAMMA_Q,
  ASCE_7_GAMMA_D,
  ASCE_7_GAMMA_L,
  BRICK_DENSITY_KG_M3,
  BRICK_COMPRESSIVE_MPA,
  BRICK_WIDTH_M,
  BRICK_HEIGHT_M,
  GRAVITY_MS2,
  COLUMN_SPACING_TABLE,
} as const
