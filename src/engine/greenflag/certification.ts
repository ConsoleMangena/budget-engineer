import type { Resource } from './resourceHub';
import { lookupArchitect } from '@/engine/compliance/architectRegistry';

export type ScoreTier = 'platinum' | 'gold' | 'silver' | 'unrated';

export const ScoreTierList: ScoreTier[] = ['platinum', 'gold', 'silver', 'unrated'];

export interface CertificationCheck {
  checkType: 'kyc' | 'zimra' | 'nssa' | 'si56-registry' | 'saz-iso' | 'insurance' | 'trade-certificate' | 'credit-check';
  passed: boolean;
  details: string;
  verifiedAt?: string;
}

export interface VettingScorecard {
  resourceId: string;
  resourceName: string;
  checks: CertificationCheck[];
  overallPassed: boolean;
  onTimeDeliveryPct: number;
  defectRatePct: number;
  reliabilityScore: number;
  wipaaHealthPct: number;
  totalProjects: number;
  rating: number;
  tier: 'platinum' | 'gold' | 'silver' | 'unrated';
  certifiedAt?: string;
}

export interface RoleCertification {
  role: string;
  trainingName: string;
  durationMinutes: number;
  completed: boolean;
  completedAt?: string;
}

export const ROLE_CERTIFICATIONS: RoleCertification[] = [
  { role: 'supplier', trainingName: 'Value-Driven Quoting TCO', durationMinutes: 20, completed: false },
  { role: 'logistics', trainingName: 'Fleet GPS & Geofencing Protocol', durationMinutes: 15, completed: false },
  { role: 'design-team', trainingName: 'SI56/2025 Compliance & Digital Twin Integration', durationMinutes: 30, completed: false },
  { role: 'money-team', trainingName: 'Red Pen Audit & BOQ Verification Standard', durationMinutes: 25, completed: false },
  { role: 'skilled-trades', trainingName: 'DzeNhare Quality Standard & Mobile Reporting', durationMinutes: 20, completed: false },
  { role: 'safety', trainingName: 'Site Safety Protocol & Incident Reporting', durationMinutes: 20, completed: false },
  { role: 'engineer', trainingName: 'Milestone Sign-Off Standard & Liability Framework', durationMinutes: 25, completed: false },
];

export function runCertificationChecks(resource: Resource): CertificationCheck[] {
  const checks: CertificationCheck[] = [
    {
      checkType: 'kyc',
      passed: resource.creditScore > 0 && resource.name.length > 0,
      details: resource.creditScore > 0 ? 'KYC verified — identity confirmed' : 'KYC pending — identity not confirmed',
      verifiedAt: resource.creditScore > 0 ? new Date().toISOString() : undefined,
    },
    {
      checkType: 'zimra',
      passed: resource.verifiedBadge,
      details: resource.verifiedBadge ? 'ZIMRA tax clearance current' : 'ZIMRA clearance not confirmed',
      verifiedAt: resource.verifiedBadge ? new Date().toISOString() : undefined,
    },
    {
      checkType: 'nssa',
      passed: resource.verifiedBadge && resource.totalProjects > 0,
      details: resource.verifiedBadge ? 'NSSA clearance valid' : 'NSSA clearance pending',
      verifiedAt: resource.verifiedBadge ? new Date().toISOString() : undefined,
    },
    {
      checkType: 'si56-registry',
      passed: resource.type === 'architect' ? resource.verifiedBadge : true,
      details: resource.type === 'architect'
        ? (resource.verifiedBadge ? 'ACZ-registered professional — SI 56/2025 compliant' : 'Architect NOT registered — cannot submit plans per SI 56/2025')
        : 'SI 56/2025 registry check not applicable for this role',
      verifiedAt: resource.verifiedBadge && resource.type === 'architect' ? new Date().toISOString() : undefined,
    },
    {
      checkType: 'insurance',
      passed: resource.reliabilityScore > 50,
      details: resource.reliabilityScore > 50 ? 'Goods-in-transit insurance confirmed' : 'Insurance verification pending',
    },
    {
      checkType: 'credit-check',
      passed: resource.creditScore >= 600,
      details: resource.creditScore >= 600 ? `Credit score ${resource.creditScore} — satisfactory` : `Credit score ${resource.creditScore} — below threshold`,
    },
  ];

  return checks;
}

export function buildVettingScorecard(resource: Resource): VettingScorecard {
  const checks = runCertificationChecks(resource);
  const overallPassed = checks.every((c) => c.passed);
  const tier = resource.wipaaHealthPct >= 90 && resource.onTimeDeliveryPct >= 95
    ? 'platinum'
    : resource.wipaaHealthPct >= 80 && resource.onTimeDeliveryPct >= 90
      ? 'gold'
      : resource.wipaaHealthPct >= 70 && resource.onTimeDeliveryPct >= 80
        ? 'silver'
        : 'unrated';

  return {
    resourceId: resource.id,
    resourceName: resource.name,
    checks,
    overallPassed,
    onTimeDeliveryPct: resource.onTimeDeliveryPct,
    defectRatePct: resource.defectRatePct,
    reliabilityScore: resource.reliabilityScore,
    wipaaHealthPct: resource.wipaaHealthPct,
    totalProjects: resource.totalProjects,
    rating: resource.rating,
    tier,
    certifiedAt: overallPassed ? new Date().toISOString() : undefined,
  };
}

export function isEligibleForAssignments(scorecard: VettingScorecard): boolean {
  return scorecard.overallPassed && scorecard.checks.some((c) => c.checkType === 'si56-registry' || c.checkType === 'kyc');
}

export function volumeRebateTier(totalSpendCents: number): { tier: string; dzenharePct: number; supplierPct: number; combinedPct: number } {
  const totalSpendUsd = totalSpendCents / 100;
  if (totalSpendUsd >= 250_000) return { tier: 'platinum', dzenharePct: 1.0, supplierPct: 0.75, combinedPct: 1.75 };
  if (totalSpendUsd >= 100_000) return { tier: 'gold', dzenharePct: 0.75, supplierPct: 0.5, combinedPct: 1.25 };
  if (totalSpendUsd >= 50_000) return { tier: 'silver', dzenharePct: 0.5, supplierPct: 0.25, combinedPct: 0.75 };
  return { tier: 'unrated', dzenharePct: 0, supplierPct: 0, combinedPct: 0 };
}

/* --------------------------------------------------------------------------
 * C3 Certification layer
 * ------------------------------------------------------------------------ */

export const CREDENTIAL_CHECKS = [
  { id: 'company-registration' },
  { id: 'tax-clearance' },
  { id: 'zimra' },
  { id: 'bank-details' },
  { id: 'insurance' },
  { id: 'architect-registry' },
  { id: 'praz-indemnity' },
  { id: 'trade-certificates' },
  { id: 'nssa' },
];

export const TIER_THRESHOLDS = {
  silver: 60,
  gold: 80,
  platinum: 92,
};

export function tierForScore(score: number): ScoreTier {
  if (score >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (score >= TIER_THRESHOLDS.gold) return 'gold';
  if (score >= TIER_THRESHOLDS.silver) return 'silver';
  return 'unrated';
}

export function rebateForTier(tier: ScoreTier): number {
  switch (tier) {
    case 'platinum': return 1.75;
    case 'gold': return 1.25;
    case 'silver': return 0.75;
    default: return 0;
  }
}

export interface CertifyEntityInput {
  projectId: string;
  entityId: string;
  entityName: string;
  credentials: {
    companyRegistration: boolean;
    taxClearance: boolean;
    zimra: boolean;
    bankDetails: boolean;
    insurance: boolean;
    architectRegistrationNumber?: string;
  };
  rating: number;
  projectCount: number;
  onTimeDeliveryPct: number;
  kind: 'contractor' | 'supplier';
  now?: Date;
}

export interface CertifyEntityResult {
  entityId: string;
  architectRegistered: boolean;
  architectName: string | null;
  score: number;
  tier: ScoreTier;
  rebatePct: number;
  checks: string[];
}

/**
 * Certifies an entity against the credential checks.
 * For contractors/suppliers with architectRegistrationNumber, validates against the SI 56/2025 ACZ registry.
 */
export function certifyEntity(input: CertifyEntityInput): CertifyEntityResult {
  const { credentials, rating, projectCount, onTimeDeliveryPct, now: _now } = input;

  // Score calculation
  let score = 0;
  // Credential checks (each true = +10, max 60)
  if (credentials.companyRegistration) score += 10;
  if (credentials.taxClearance) score += 10;
  if (credentials.zimra) score += 10;
  if (credentials.bankDetails) score += 10;
  if (credentials.insurance) score += 10;
  // Architect registry check (only if architectRegistrationNumber provided)
  let architectRegistered = false;
  let architectName: string | null = null;
  if (credentials.architectRegistrationNumber) {
    const architect = lookupArchitect(credentials.architectRegistrationNumber);
    architectRegistered = !!architect;
    architectName = architect?.name ?? null;
    if (architectRegistered) score += 10;
  }

  // Rating (max 20)
  if (rating >= 4.5) score += 20;
  else if (rating >= 4.0) score += 15;
  else if (rating >= 3.5) score += 10;

  // Project count (max 10)
  if (projectCount >= 20) score += 10;
  else if (projectCount >= 10) score += 5;

  // On-time delivery (max 10)
  if (onTimeDeliveryPct >= 95) score += 10;
  else if (onTimeDeliveryPct >= 90) score += 5;

  // Cap at 100
  score = Math.min(score, 100);

  const tier = tierForScore(score);
  const rebatePct = rebateForTier(tier);

  // Build checks array
  const checks: string[] = [];
  if (credentials.companyRegistration) checks.push('Company Registration');
  if (credentials.taxClearance) checks.push('Tax Clearance (ZIMRA)');
  if (credentials.zimra) checks.push('ZIMRA Compliance');
  if (credentials.bankDetails) checks.push('Bank Details Verified');
  if (credentials.insurance) checks.push('Insurance Coverage');
  if (architectRegistered) checks.push('Architect Registry License (SI 56/2025)');
  checks.push('PRAZ Indemnity');
  checks.push('Trade Certificates');
  checks.push('NSSA Compliance');

  return {
    entityId: input.entityId,
    architectRegistered,
    architectName,
    score,
    tier,
    rebatePct,
    checks,
  };
}

export interface BuildScoreCardInput {
  projectId: string;
  entityId: string;
  entityName: string;
  credentials: {
    companyRegistration: boolean;
    taxClearance: boolean;
    zimra: boolean;
    bankDetails: boolean;
    insurance: boolean;
    architectRegistrationNumber?: string;
  };
  rating: number;
  projectCount: number;
  onTimeDeliveryPct: number;
  kind: 'contractor' | 'supplier';
  now?: Date;
}

export interface BuildContractorScorecardResult {
  id: string;
  projectId: string;
  contractorId: string;
  contractorName: string;
  tier: ScoreTier;
  score: number;
  checks: string[];
  verified: boolean;
  rebatePct: number;
  createdAt: string;
}

/**
 * Builds a contractor scorecard persisted to DB.
 * ID format: 'cs-p1-e1'
 */
export function buildContractorScorecard(input: BuildScoreCardInput): BuildContractorScorecardResult {
  const now = input.now ?? new Date();
  const certResult = certifyEntity({
    projectId: input.projectId,
    entityId: input.entityId,
    entityName: input.entityName,
    credentials: input.credentials,
    rating: input.rating,
    projectCount: input.projectCount,
    onTimeDeliveryPct: input.onTimeDeliveryPct,
    kind: input.kind,
    now,
  });
  return {
    id: `cs-${input.projectId}-${input.entityId}`,
    projectId: input.projectId,
    contractorId: input.entityId,
    contractorName: input.entityName,
    tier: certResult.tier,
    score: certResult.score,
    checks: CREDENTIAL_CHECKS.map(c => c.id),
    verified: certResult.architectRegistered || certResult.score >= TIER_THRESHOLDS.silver,
    rebatePct: certResult.rebatePct,
    createdAt: now.toISOString(),
  };
}

export interface BuildSupplierScorecardResult {
  id: string;
  projectId: string;
  supplierId: string;
  supplierName: string;
  tier: ScoreTier;
  score: number;
  verified: boolean;
  rebatePct: number;
  createdAt: string;
}

/**
 * Builds a supplier scorecard persisted to DB.
 * ID format: 'ss-p1-e1'
 */
export function buildSupplierScorecard(input: BuildScoreCardInput): BuildSupplierScorecardResult {
  const now = input.now ?? new Date();
  const certResult = certifyEntity({
    projectId: input.projectId,
    entityId: input.entityId,
    entityName: input.entityName,
    credentials: input.credentials,
    rating: input.rating,
    projectCount: input.projectCount,
    onTimeDeliveryPct: input.onTimeDeliveryPct,
    kind: input.kind,
    now,
  });
  return {
    id: `ss-${input.projectId}-${input.entityId}`,
    projectId: input.projectId,
    supplierId: input.entityId,
    supplierName: input.entityName,
    tier: certResult.tier,
    score: certResult.score,
    verified: certResult.architectRegistered || certResult.score >= TIER_THRESHOLDS.silver,
    rebatePct: certResult.rebatePct,
    createdAt: now.toISOString(),
  };
}

export const REBATE_TIERS = [
  { tier: 'silver', minContractDollars: 50_000, maxContractDollars: 100_000, totalPct: 0.75 },
  { tier: 'gold', minContractDollars: 100_000, maxContractDollars: 250_000, totalPct: 1.25 },
  { tier: 'platinum', minContractDollars: 250_000, maxContractDollars: null, totalPct: 1.75 },
];

export const SAZ_CERTIFIED_PRODUCTS = [
  { product: 'Willdale Bricks', standard: 'SAZ 7 MPa', certified: true },
  { product: 'Sino Cement 50kg', standard: 'SAZ 42.5N', certified: true },
  { product: 'PG Glass', standard: 'SAZ 6mm Float', certified: true },
  { product: 'Davis Doors', standard: 'SAZ Fire Rated', certified: true },
];

export function rebateForContract(contractValueCents: number): number {
  const dollars = contractValueCents / 100;
  if (dollars >= 250_000) return 1.75;
  if (dollars >= 100_000) return 1.25;
  if (dollars >= 50_000) return 0.75;
  return 0;
}

export function autoVerifyProduct(productName: string): { verified: boolean; standard: string } {
  const found = SAZ_CERTIFIED_PRODUCTS.find((p) => p.product.toLowerCase() === productName.toLowerCase());
  return { verified: !!found, standard: found?.standard ?? 'Unknown' };
}
