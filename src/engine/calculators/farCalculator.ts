export interface FarZone {
  footprintM2?: number
  floors: number
}

export interface FarInput {
  siteAreaM2: number
  coverage?: number
  zones: FarZone[]
  useSplit?: Record<string, number>
  bonusFar?: number
}

export interface FarZoneDetail {
  zone: number
  footprintM2: number
  floors: number
  gfaM2: number
}

export interface FarResult {
  siteAreaM2: number
  totalFootprintM2: number
  effectiveCoverage: number
  openGroundM2: number
  openSpacePct: number
  numZones: number
  zoneDetails: FarZoneDetail[]
  totalGfaM2: number
  baseFar: number
  bonusFar: number
  bonusGfaM2: number
  effectiveFar: number
  totalGfaWithBonusM2: number
  useBreakdownM2: Record<string, number>
  warnings: string[]
}

export function computeFar(input: FarInput): FarResult {
  const warnings: string[] = []
  const { siteAreaM2, zones, useSplit, bonusFar = 0 } = input

  if (siteAreaM2 <= 0) {
    warnings.push('Site area must be positive')
    return emptyResult(siteAreaM2, bonusFar, warnings)
  }

  if (zones.length === 0) {
    warnings.push('No zones provided')
    return emptyResult(siteAreaM2, bonusFar, warnings)
  }

  const invalidZone = zones.find((z) => z.floors <= 0)
  if (invalidZone) {
    warnings.push(`Invalid zone: floor count must be positive`)
    return emptyResult(siteAreaM2, bonusFar, warnings)
  }

  const numZones = zones.length
  const coverage = input.coverage ?? 0.6

  let zoneFootprints: number[]
  let totalFootprint: number
  let effectiveCoverage: number

  const hasExplicitFootprints = zones.every((z) => z.footprintM2 != null && z.footprintM2 > 0)

  if (hasExplicitFootprints) {
    zoneFootprints = zones.map((z) => z.footprintM2!)
    totalFootprint = zoneFootprints.reduce((s, f) => s + f, 0)
    effectiveCoverage = totalFootprint / siteAreaM2
  } else {
    if (coverage <= 0 || coverage > 1) {
      warnings.push('Coverage must be between 0 (exclusive) and 1.0 (inclusive)')
      return emptyResult(siteAreaM2, bonusFar, warnings)
    }
    totalFootprint = siteAreaM2 * coverage
    zoneFootprints = Array.from({ length: numZones }, () => totalFootprint / numZones)
    effectiveCoverage = coverage
  }

  const zoneGfa = zones.map((z, i) => zoneFootprints[i] * z.floors)
  const totalGfa = zoneGfa.reduce((s, g) => s + g, 0)

  const baseFar = totalGfa / siteAreaM2
  const bonusGfa = bonusFar * siteAreaM2
  const effectiveFar = baseFar + bonusFar
  const totalGfaWithBonus = totalGfa + bonusGfa

  const useBreakdown: Record<string, number> = {}
  if (useSplit) {
    const totalPct = Object.values(useSplit).reduce((s, p) => s + p, 0)
    if (Math.abs(totalPct - 100) > 0.5) {
      warnings.push(`Use-split sums to ${totalPct}%, expected 100%`)
    }
    for (const [name, pct] of Object.entries(useSplit)) {
      useBreakdown[name] = Number((totalGfaWithBonus * (pct / 100)).toFixed(1))
    }
  } else {
    useBreakdown['mixed'] = Number(totalGfaWithBonus.toFixed(1))
  }

  const zoneDetails: FarZoneDetail[] = zones.map((z, i) => ({
    zone: i + 1,
    footprintM2: Number(zoneFootprints[i].toFixed(1)),
    floors: z.floors,
    gfaM2: Number(zoneGfa[i].toFixed(1)),
  }))

  const openGround = siteAreaM2 - totalFootprint
  const openSpacePct = (openGround / siteAreaM2) * 100

  return {
    siteAreaM2: Number(siteAreaM2.toFixed(1)),
    totalFootprintM2: Number(totalFootprint.toFixed(1)),
    effectiveCoverage: Number(effectiveCoverage.toFixed(3)),
    openGroundM2: Number(openGround.toFixed(1)),
    openSpacePct: Number(openSpacePct.toFixed(1)),
    numZones,
    zoneDetails,
    totalGfaM2: Number(totalGfa.toFixed(1)),
    baseFar: Number(baseFar.toFixed(3)),
    bonusFar: Number(bonusFar.toFixed(3)),
    bonusGfaM2: Number(bonusGfa.toFixed(1)),
    effectiveFar: Number(effectiveFar.toFixed(3)),
    totalGfaWithBonusM2: Number(totalGfaWithBonus.toFixed(1)),
    useBreakdownM2: useBreakdown,
    warnings,
  }
}

function emptyResult(siteAreaM2: number, bonusFar: number, warnings: string[]): FarResult {
  return {
    siteAreaM2,
    totalFootprintM2: 0,
    effectiveCoverage: 0,
    openGroundM2: siteAreaM2,
    openSpacePct: 100,
    numZones: 0,
    zoneDetails: [],
    totalGfaM2: 0,
    baseFar: 0,
    bonusFar,
    bonusGfaM2: 0,
    effectiveFar: bonusFar,
    totalGfaWithBonusM2: 0,
    useBreakdownM2: {},
    warnings,
  }
}
