export interface RoomAreaInput {
  area: number
  name?: string
  type?: string
}

export interface AreaScheduleResult {
  grossFloorArea: number
  netUsableArea: number
  circulationArea: number
  circulationPercent: number
  roomCount: number
  areaPerRoom: { name: string; area: number }[]
  efficiencyRatio: number
  warnings: string[]
  farDerivation?: FarDerivation
  setbacks?: SetbackResult
  envelope?: EnvelopeResult
}

export interface FarDerivation {
  siteAreaM2: number
  far: number
  totalGfaM2: number
  derived: boolean
}

export interface SetbackResult {
  frontM: number
  rearM: number
  sideM: number
  buildableWidthM: number
  buildableDepthM: number
  buildableAreaM2: number
  coveragePct: number
}

export interface EnvelopeResult {
  wallAreaM2: number
  roofAreaM2: number
  floorAreaM2: number
  windowAreaM2: number
  totalEnvelopeAreaM2: number
  wallToFloorRatio: number
  assumedStoreyHeightM: number
  assumedWindowToWallPct: number
}

const DEFAULT_CIRCULATION_PCT = 0.25
const DEFAULT_STOREY_HEIGHT_M = 3.0
const DEFAULT_WINDOW_TO_WALL_PCT = 0.25

export function computeAreaSchedule(
  rooms: RoomAreaInput[],
  grossFloorArea?: number,
  circulationPct?: number,
): AreaScheduleResult {
  const warnings: string[] = []

  if (!rooms || rooms.length === 0) {
    return {
      grossFloorArea: 0,
      netUsableArea: 0,
      circulationArea: 0,
      circulationPercent: 0,
      roomCount: 0,
      areaPerRoom: [],
      efficiencyRatio: 0,
      warnings: ['No rooms provided'],
    }
  }

  const validRooms = rooms.filter((r) => r.area >= 0)
  const netUsableArea = Number(validRooms.reduce((s, r) => s + r.area, 0).toFixed(2))

  const circPct = circulationPct ?? DEFAULT_CIRCULATION_PCT
  const gfa = grossFloorArea ?? (netUsableArea > 0 ? Number((netUsableArea / (1 - circPct)).toFixed(2)) : 0)
  const circulationArea = Number((gfa - netUsableArea).toFixed(2))

  if (circulationArea < 0) {
    warnings.push('Gross floor area is less than net usable area; check inputs')
  }

  const areaPerRoom = validRooms
    .filter((r) => r.area > 0)
    .map((r) => ({
      name: r.name ?? r.type ?? 'Unnamed',
      area: Number(r.area.toFixed(2)),
    }))

  const efficiencyRatio = gfa > 0 ? Number((netUsableArea / gfa).toFixed(4)) : 0

  if (rooms.some((r) => r.area < 0)) {
    warnings.push('Some rooms have negative area; they were excluded')
  }

  return {
    grossFloorArea: gfa,
    netUsableArea,
    circulationArea: Math.max(0, circulationArea),
    circulationPercent: gfa > 0 ? Number(((circulationArea / gfa) * 100).toFixed(1)) : 0,
    roomCount: validRooms.length,
    areaPerRoom,
    efficiencyRatio,
    warnings,
  }
}

export interface FarDerivationInput {
  siteAreaM2: number
  far: number
  rooms: RoomAreaInput[]
  circulationPct?: number
}

export function computeFarDerivation(input: FarDerivationInput): AreaScheduleResult & { farDerivation: FarDerivation } {
  const { siteAreaM2, far, rooms, circulationPct } = input
  const warnings: string[] = []

  if (siteAreaM2 <= 0) {
    warnings.push('Site area must be positive for FAR derivation')
  }
  if (far < 0) {
    warnings.push('FAR must be non-negative')
  }

  const totalGfaM2 = Math.max(0, siteAreaM2 * far)
  const result = computeAreaSchedule(rooms, totalGfaM2, circulationPct)
  result.warnings.push(...warnings)

  return {
    ...result,
    farDerivation: {
      siteAreaM2,
      far,
      totalGfaM2: Number(totalGfaM2.toFixed(2)),
      derived: true,
    },
  }
}

export interface SetbackInput {
  siteWidthM: number
  siteDepthM: number
  frontM?: number
  rearM?: number
  sideM?: number
  jurisdiction?: 'zimbabwe' | 'south-africa'
}

const ZBC_SETBACKS = { front: 6, rear: 3, side: 1.5 }
const SA_SETBACKS = { front: 5, rear: 3, side: 2 }

export function computeSetbacks(input: SetbackInput): SetbackResult {
  const { siteWidthM, siteDepthM } = input
  const defaults = input.jurisdiction === 'south-africa' ? SA_SETBACKS : ZBC_SETBACKS

  const frontM = Math.max(0, input.frontM ?? defaults.front)
  const rearM = Math.max(0, input.rearM ?? defaults.rear)
  const sideM = Math.max(0, input.sideM ?? defaults.side)

  const buildableWidthM = Math.max(0, siteWidthM - 2 * sideM)
  const buildableDepthM = Math.max(0, siteDepthM - frontM - rearM)
  const buildableAreaM2 = Number((buildableWidthM * buildableDepthM).toFixed(2))
  const siteAreaM2 = siteWidthM * siteDepthM
  const coveragePct = siteAreaM2 > 0 ? Number(((buildableAreaM2 / siteAreaM2) * 100).toFixed(1)) : 0

  return {
    frontM,
    rearM,
    sideM,
    buildableWidthM: Number(buildableWidthM.toFixed(2)),
    buildableDepthM: Number(buildableDepthM.toFixed(2)),
    buildableAreaM2,
    coveragePct,
  }
}

export interface EnvelopeInput {
  grossFloorAreaM2: number
  floors?: number
  storeyHeightM?: number
  windowToWallPct?: number
  assumedWidthM?: number
}

export function computeBuildingEnvelope(input: EnvelopeInput): EnvelopeResult {
  const { grossFloorAreaM2 } = input
  const floors = Math.max(1, input.floors ?? 1)
  const storeyHeightM = input.storeyHeightM ?? DEFAULT_STOREY_HEIGHT_M
  const windowPct = input.windowToWallPct ?? DEFAULT_WINDOW_TO_WALL_PCT

  const floorAreaM2 = grossFloorAreaM2 / floors
  const widthM = input.assumedWidthM ?? Math.sqrt(floorAreaM2)
  const perimeterM = 2 * (widthM + floorAreaM2 / Math.max(0.1, widthM))

  const wallAreaM2 = Number((perimeterM * storeyHeightM * floors).toFixed(2))
  const windowAreaM2 = Number((wallAreaM2 * windowPct).toFixed(2))
  const roofAreaM2 = Number(floorAreaM2.toFixed(2))
  const totalEnvelopeAreaM2 = Number((wallAreaM2 + roofAreaM2 + windowAreaM2).toFixed(2))
  const wallToFloorRatio = floorAreaM2 > 0 ? Number((wallAreaM2 / grossFloorAreaM2).toFixed(2)) : 0

  return {
    wallAreaM2,
    roofAreaM2,
    floorAreaM2: Number(floorAreaM2.toFixed(2)),
    windowAreaM2,
    totalEnvelopeAreaM2,
    wallToFloorRatio,
    assumedStoreyHeightM: storeyHeightM,
    assumedWindowToWallPct: windowPct,
  }
}

export const DEFAULTS = { DEFAULT_CIRCULATION_PCT, DEFAULT_STOREY_HEIGHT_M, DEFAULT_WINDOW_TO_WALL_PCT, ZBC_SETBACKS, SA_SETBACKS } as const
