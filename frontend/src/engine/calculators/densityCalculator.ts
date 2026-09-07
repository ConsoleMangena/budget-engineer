export interface DensityInput {
  siteAreaM2: number
  far: number
  avgUnitSizeM2?: number
  efficiency?: number
  householdSize?: number
  residentialPct?: number
  streetsPct?: number
}

export type DensityClassification =
  | 'Low density (suburban)'
  | 'Medium-low density'
  | 'Medium density (urban)'
  | 'High density (urban core)'
  | 'Very high density (metropolitan core)'

export interface DensityResult {
  totalGfaM2: number
  residentialGfaM2: number
  nonResidentialGfaM2: number
  netInternalAreaM2: number
  dwellingUnits: number
  population: number
  netSiteAreaHa: number
  grossSiteAreaM2: number
  grossSiteAreaHa: number
  netDensityDuPerHa: number
  grossDensityDuPerHa: number
  populationDensityPersonsPerHa: number
  grossPopulationDensityPersonsPerHa: number
  densityClassification: DensityClassification
  warnings: string[]
}

export function computeDensity(input: DensityInput): DensityResult {
  const warnings: string[] = []

  const {
    siteAreaM2,
    far,
    avgUnitSizeM2 = 85,
    efficiency = 0.75,
    householdSize = 2.5,
    residentialPct = 0.7,
    streetsPct = 0.3,
  } = input

  if (siteAreaM2 <= 0 || far <= 0) {
    warnings.push('Site area and FAR must be positive')
    return emptyDensityResult(warnings)
  }
  if (avgUnitSizeM2 <= 0) {
    warnings.push('Average unit size must be positive')
    return emptyDensityResult(warnings)
  }
  if (efficiency <= 0 || efficiency > 1) {
    warnings.push('Efficiency must be between 0 (exclusive) and 1.0 (inclusive)')
    return emptyDensityResult(warnings)
  }
  if (householdSize <= 0) {
    warnings.push('Household size must be positive')
    return emptyDensityResult(warnings)
  }

  const safeResPct = Math.max(0, Math.min(1, residentialPct))
  const safeStreetsPct = Math.max(0, Math.min(0.99, streetsPct))

  const totalGfa = siteAreaM2 * far
  const residentialGfa = totalGfa * safeResPct
  const nonResidentialGfa = totalGfa - residentialGfa
  const netInternalArea = residentialGfa * efficiency

  const dwellingUnits = Math.floor(netInternalArea / avgUnitSizeM2)
  const population = Math.round(dwellingUnits * householdSize)

  const netSiteAreaHa = siteAreaM2 / 10_000
  const grossSiteArea = siteAreaM2 / (1 - safeStreetsPct)
  const grossSiteAreaHa = grossSiteArea / 10_000

  const netDensity = netSiteAreaHa > 0 ? dwellingUnits / netSiteAreaHa : 0
  const grossDensity = grossSiteAreaHa > 0 ? dwellingUnits / grossSiteAreaHa : 0
  const popDensity = netSiteAreaHa > 0 ? population / netSiteAreaHa : 0
  const grossPopDensity = grossSiteAreaHa > 0 ? population / grossSiteAreaHa : 0

  let classification: DensityClassification
  if (netDensity < 25) classification = 'Low density (suburban)'
  else if (netDensity < 75) classification = 'Medium-low density'
  else if (netDensity < 150) classification = 'Medium density (urban)'
  else if (netDensity < 300) classification = 'High density (urban core)'
  else classification = 'Very high density (metropolitan core)'

  return {
    totalGfaM2: Number(totalGfa.toFixed(1)),
    residentialGfaM2: Number(residentialGfa.toFixed(1)),
    nonResidentialGfaM2: Number(nonResidentialGfa.toFixed(1)),
    netInternalAreaM2: Number(netInternalArea.toFixed(1)),
    dwellingUnits,
    population,
    netSiteAreaHa: Number(netSiteAreaHa.toFixed(3)),
    grossSiteAreaM2: Number(grossSiteArea.toFixed(1)),
    grossSiteAreaHa: Number(grossSiteAreaHa.toFixed(3)),
    netDensityDuPerHa: Number(netDensity.toFixed(1)),
    grossDensityDuPerHa: Number(grossDensity.toFixed(1)),
    populationDensityPersonsPerHa: Number(popDensity.toFixed(1)),
    grossPopulationDensityPersonsPerHa: Number(grossPopDensity.toFixed(1)),
    densityClassification: classification,
    warnings,
  }
}

function emptyDensityResult(warnings: string[]): DensityResult {
  return {
    totalGfaM2: 0,
    residentialGfaM2: 0,
    nonResidentialGfaM2: 0,
    netInternalAreaM2: 0,
    dwellingUnits: 0,
    population: 0,
    netSiteAreaHa: 0,
    grossSiteAreaM2: 0,
    grossSiteAreaHa: 0,
    netDensityDuPerHa: 0,
    grossDensityDuPerHa: 0,
    populationDensityPersonsPerHa: 0,
    grossPopulationDensityPersonsPerHa: 0,
    densityClassification: 'Low density (suburban)',
    warnings,
  }
}
