import type { Resource } from './resourceHub';
import type { ContractorCandidate, BestFitResult, TeamAssignment, MilestoneSplit, AssemblyPath } from '@/domain/greenflag';

export type ServiceMode = 'do-it-together' | 'do-it-for-them' | 'do-it-alone';

export type WizardStep = 'path' | 'team' | 'contract' | 'escrow';

export interface BestFitOptions {
  specialization?: string;
  availableFrom?: string;
}

export interface TeamMember {
  resourceId: string;
  name: string;
  role: string;
  company?: string;
  rating: number;
  reliabilityPct: number;
  wipaaHealthPct: number;
  distanceKm?: number;
  matchRationale: string[];
  estimatedCostCents: number;
  availableDate: string;
  approved: boolean;
}

export interface TeamAssembly {
  projectId: string;
  serviceMode: ServiceMode;
  members: TeamMember[];
  totalEstimatedCents: number;
  assembledAt: string;
  contractGenerated: boolean;
}

export interface MatchCriteria {
  siteDistanceKm?: number;
  projectType?: string;
  budgetRangeCents?: { min: number; max: number };
  requiredRoles: string[];
}

export function matchContractor(
  resources: Resource[],
  criteria: MatchCriteria,
  topK = 3,
): { resource: Resource; score: number; rationale: string[] }[] {
  const candidates = resources.filter((r) => {
    if (r.type === 'supplier') return false;
    if (criteria.requiredRoles.length > 0 && !criteria.requiredRoles.some((role) => r.type.includes(role) || r.role.includes(role))) return false;
    return true;
  });

  const scored = candidates.map((r) => {
    const rationale: string[] = [];
    let score = 0;

    if (r.rating >= 4.5) { score += 30; rationale.push(`${r.rating}★ rating`); }
    if (r.onTimeDeliveryPct >= 95) { score += 25; rationale.push(`${r.onTimeDeliveryPct}% on-time delivery`); }
    if (r.wipaaHealthPct >= 85) { score += 20; rationale.push(`${r.wipaaHealthPct}% WIPAA health — financially healthy`); }

    if (criteria.siteDistanceKm && r.locationGps) {
      const dist = criteria.siteDistanceKm;
      if (dist <= 8) { score += 15; rationale.push(`${dist}km from site — fast mobilization`); }
      else if (dist <= 20) { score += 8; rationale.push(`${dist}km from site`); }
    }

    if (criteria.projectType && r.specialization.some((s) => s.toLowerCase().includes(criteria.projectType!.toLowerCase()))) {
      score += 10;
      rationale.push(`${r.totalProjects} similar projects completed`);
    }

    return { resource: r, score, rationale };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}

export function buildTeamAssembly(
  projectId: string,
  serviceMode: ServiceMode,
  matchedResources: { resource: Resource; score: number; rationale: string[] }[],
  estimatedCosts: Map<string, number>,
  availableDate: string,
): TeamAssembly {
  const members: TeamMember[] = matchedResources.map(({ resource, rationale }) => ({
    resourceId: resource.id,
    name: resource.name,
    role: resource.role,
    company: resource.company,
    rating: resource.rating,
    reliabilityPct: resource.onTimeDeliveryPct,
    wipaaHealthPct: resource.wipaaHealthPct,
    matchRationale: rationale,
    estimatedCostCents: estimatedCosts.get(resource.id) ?? 0,
    availableDate: resource.availableFrom ?? availableDate,
    approved: false,
  }));

  return {
    projectId,
    serviceMode,
    members,
    totalEstimatedCents: members.reduce((sum, m) => sum + m.estimatedCostCents, 0),
    assembledAt: new Date().toISOString(),
    contractGenerated: false,
  };
}

export function generateContractTerms(team: TeamAssembly): {
  clauses: string[];
  paymentSchedule: { milestone: string; pct: number; amountCents: number }[];
  riskClauses: string[];
} {
  const paymentSchedule = [
    { milestone: 'Foundation & Bones', pct: 35, amountCents: Math.round(team.totalEstimatedCents * 0.35) },
    { milestone: 'Wall Plate & Shell', pct: 40, amountCents: Math.round(team.totalEstimatedCents * 0.40) },
    { milestone: 'Finishes & Keys', pct: 25, amountCents: Math.round(team.totalEstimatedCents * 0.25) },
  ];

  return {
    clauses: [
      'Price Acceleration Clause: Materials cost adjustments tied to SADC Market Price Index',
      'Currency Clause: Payments in USD or ZiG at prevailing interbank rate on payment date',
      'Force Majeure: Neither party liable for delays caused by events beyond reasonable control',
      'Dispute Resolution: DzeNhare Concierge mediation before arbitration',
    ],
    paymentSchedule,
    riskClauses: [
      'Contractor WIPAA health monitored monthly — amber alert at <85%, red intervention at <70%',
      'No verbal change orders — all variations through Variation Vault',
      'Escrow-gated payments — released only upon Digital Twin verification',
    ],
  };
}

/* --------------------------------------------------------------------------
 * C2 Team Assembly layer
 * ------------------------------------------------------------------------ */

export const MATERIALS_TRANSPARENCY = {
  label: 'Materials Transparency',
  description: 'Real-time material pricing and supplier verification',
};

export function money(cents: number): string {
  return new Intl.NumberFormat('en-ZW', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export const MATERIALS_TOTAL_CENTS = 1_000_000;

export const FORTRESS_FEE_RANGE_PCT = { min: 12, max: 15 };

export const FORCE_MAJEURE_CLAUSE = 'Force Majeure: Neither party liable for delays caused by events beyond reasonable control';

export const ACCELERATED_TIERS = [
  { tier: 'Bronze', minProjects: 1, discount: 0 },
  { tier: 'Silver', minProjects: 5, discount: 2 },
  { tier: 'Gold', minProjects: 15, discount: 5 },
  { tier: 'Platinum', minProjects: 30, discount: 8 },
];

export const WIZARD_STEPS = [
  { id: 'path', label: 'Assembly Path', description: 'Choose how you want to build' },
  { id: 'team', label: 'Team', description: 'Match with verified contractors' },
  { id: 'contract', label: 'Contract', description: 'Review and sign agreement' },
  { id: 'escrow', label: 'Escrow', description: 'Set up payment milestones' },
];

export const ASSEMBLY_PATHS: Array<{ id: AssemblyPath; includes: string[]; description: string }> = [
  {
    id: 'alone',
    includes: ['P4P Calculator', 'WIPAA Monitor', 'Red Pen Audit $50', 'Ghost Materials', 'Group Buy Aggregator', 'My Must-Haves'],
    description: 'Builder self-executes with DzeNhare toolbelt',
  },
  {
    id: 'together',
    includes: ['P4P Calculator', 'WIPAA Monitor', 'Red Pen Audit $50', 'Ghost Materials', 'Group Buy Aggregator', 'My Must-Haves', 'Contractor Match', 'Escrow Vault'],
    description: 'Builder + Contractor co-manage',
  },
  {
    id: 'for-them',
    includes: ['P4P Calculator', 'WIPAA Monitor', 'Red Pen Audit $50', 'Ghost Materials', 'Group Buy Aggregator', 'My Must-Haves', 'Contractor Match', 'Escrow Vault', 'Full Turnkey 12-15% margin', '45 minutes onboarding'],
    description: 'DzeNhare Fortress turnkey — we manage everything',
  },
];

export const MILESTONE_SPLIT: MilestoneSplit[] = [
  { name: 'Foundation & Bones', pct: 35 },
  { name: 'Wall Plate & Shell', pct: 40 },
  { name: 'Finishes & Keys', pct: 25 },
];

export function bestFitContractor(
  candidates: ContractorCandidate[],
  criteria: { specialization?: string; availableFrom?: string },
): BestFitResult | null {
  if (!candidates || candidates.length === 0) return null;

  const scored = candidates.map((c) => {
    const reasons: string[] = [];
    let score = 0;

    // Specialization match (max 25)
    if (criteria.specialization && c.specialization?.toLowerCase().includes(criteria.specialization.toLowerCase())) {
      score += 25;
      reasons.push(`${c.specialization} specialist`);
    }

    // Rating (max 20)
    if (c.rating >= 4.5) {
      score += 20;
      reasons.push(`Rated ${c.rating}★ (${c.reviews} reviews)`);
    } else if (c.rating >= 4.0) {
      score += 15;
      reasons.push(`Rated ${c.rating}★ (${c.reviews} reviews)`);
    } else if (c.rating >= 3.5) {
      score += 10;
    }

    // Distance (11 points for <=8km, 8 for <=20km, 3 for <=50km)
    if (c.distanceKm <= 8) {
      score += 11;
      reasons.push(`${c.distanceKm}km — within the 8km radius`);
    } else if (c.distanceKm <= 20) {
      score += 8;
      reasons.push(`${c.distanceKm}km from site`);
    } else if (c.distanceKm <= 50) {
      score += 3;
    }

    // WIPAA health (15 points for >=90, 10 for >=80, 5 for >=70)
    if (c.wipaaPct >= 90) {
      score += 15;
      reasons.push(`WIPAA variance ${c.wipaaPct}%`);
    } else if (c.wipaaPct >= 80) {
      score += 10;
      reasons.push(`WIPAA variance ${c.wipaaPct}%`);
    } else if (c.wipaaPct >= 70) {
      score += 5;
    }

    // Availability bonus
    if (criteria.availableFrom && c.availableFrom && new Date(c.availableFrom) <= new Date(criteria.availableFrom)) {
      score += 5;
      reasons.push('Available on or before project start');
    }

    // Project count bonus (10 for >=20, 5 for >=10)
    if (c.projectCount >= 20) {
      score += 10;
    } else if (c.projectCount >= 10) {
      score += 5;
    }

    return { candidate: c, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < 30) return null;

  return { candidate: best.candidate, score: best.score, reasons: best.reasons };
}

export interface GenerateContractInput {
  projectId: string;
  path: AssemblyPath;
  contractor: ContractorCandidate | null;
  totalEstimatedCents: number;
}

export interface GenerateContractResult {
  assignment: TeamAssignment;
  terms: string[];
}

/**
 * Generates a contract with DZ-YYYYMMDD-NNN reference.
 * For 'for-them' path, terms include '12-15%' margin note.
 */
export function generateContract(input: GenerateContractInput): GenerateContractResult {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  const contractRef = `DZ-${dateStr}-${seq}`;

  const terms: string[] = [];

  // Header terms
  terms.push(`Contract Reference: ${contractRef}`);
  terms.push(`Project: ${input.projectId}`);
  terms.push(`Assembly Path: ${input.path}`);

  if (input.contractor) {
    terms.push(`Contractor: ${input.contractor.name} (${input.contractor.id})`);
    terms.push(`Specialization: ${input.contractor.specialization}`);
    terms.push(`Rating: ${input.contractor.rating}★ (${input.contractor.reviews} reviews)`);
    terms.push(`Distance: ${input.contractor.distanceKm}km`);
    terms.push(`WIPAA Variance: ${input.contractor.wipaaPct}%`);
  } else {
    terms.push('Contractor: ASSIGNED BY DZENHARE CONCIERGE (12-15% margin)');
  }

  // Milestone terms
  terms.push('Milestone Split:');
  for (const ms of MILESTONE_SPLIT) {
    const amount = Math.round(input.totalEstimatedCents * ms.pct / 100);
    terms.push(`  ${ms.name}: ${ms.pct}% (${Math.round(amount / 100).toLocaleString()} USD)`);
  }

  // Standard terms
  terms.push('Retention: 10% held until Final Completion Certificate');
  terms.push('Price Acceleration: Tied to SADC Market Price Index');
  terms.push('Currency: Payments in USD or ZiG at prevailing interbank rate');
  terms.push('Force Majeure: Neither party liable for delays beyond reasonable control');
  terms.push('Dispute Resolution: DzeNhare Concierge mediation before arbitration');
  terms.push('WIPAA Monitoring: Monthly — amber <85%, red intervention <70%');
  terms.push('No verbal change orders — all variations through Variation Vault');
  terms.push('Escrow-gated payments — released only upon Digital Twin verification');

  const assignment: TeamAssignment = {
    id: `ta-${input.projectId}-${seq}`,
    projectId: input.projectId,
    path: input.path,
    contractorId: input.contractor?.id ?? null,
    contractorName: input.contractor?.name ?? null,
    milestoneSplit: MILESTONE_SPLIT,
    contractRef,
    terms,
    createdAt: new Date().toISOString(),
  };

  return { assignment, terms };
}
