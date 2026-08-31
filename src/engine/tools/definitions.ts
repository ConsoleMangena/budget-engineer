/**
 * Tool / function-calling layer — PHASE 1 audit fix.
 *
 * Strict Zod schemas (positive numbers, enums, `.strict()` object shape) so a
 * single-shot prompt→JSON call can never inject strings into arithmetic or
 * reach a read-only regulation tool with a write intent. Tools are classified
 * read (regulation/material/measurement retrieval) or write (math/payment).
 *
 * Agent scoping is enforced at the graph boundary:
 *   Researcher → READ_TOOLS only
 *   Calculator → WRITE_TOOLS only
 *   Supervisor → gono_go_decision only (the orchestrator's GO / NO-GO pen)
 *
 * This registry is the single authority for both the deterministic KPI2
 * orchestrator (via the `agents/tools.ts` adapter) and the LLM
 * function-calling layer.
 */

import { z } from 'zod';

// ————————————————————— schemas —————————————————————

export const queryBlawsSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    chapter: z.enum(['2', '4', 'all']).optional(),
  })
  .strict();

export const querySazSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    standard: z.string().optional(),
  })
  .strict();

export const queryZiqsSchema = z
  .object({
    query: z.string().min(5, 'query must be at least 5 characters'),
    section: z.enum(['excavation', 'site-preparation', 'scaffolding', 'concrete', 'masonry', 'roofing', 'all']).optional(),
  })
  .strict();

export const querySi56Schema = z
  .object({
    planId: z.string().min(1, 'planId is required'),
    architectRegistrationNumber: z.string().optional(),
  })
  .strict();

export const queryMarketIndexSchema = z
  .object({
    symbol: z.string().min(1).optional(),
    currency: z.enum(['USD', 'ZWG']).optional(),
  })
  .strict();

export const searchCodesSchema = z
  .object({
    query: z.string().min(3, 'query must be at least 3 characters'),
    jurisdiction: z.enum(['zimbabwe', 'south-africa', 'any']).optional().default('any'),
    k: z.number().int().positive().max(20).optional().default(5),
    docId: z.string().optional(),
  })
  .strict();

export const calculateBrickQuantitySchema = z
  .object({
    length_m: z.number().positive('length_m must be a positive number'),
    height_m: z.number().positive('height_m must be a positive number'),
    thickness_units: z.number().positive().default(1),
    bond_type: z.enum(['stretcher', 'header', 'English', 'Flemish']).default('stretcher'),
    wastage_pct: z.number().min(0).max(20).default(5),
  })
  .strict();

export const calculateConcreteVolumeSchema = z
  .object({
    length_m: z.number().positive(),
    width_m: z.number().positive(),
    depth_m: z.number().positive(),
  })
  .strict();

export const calculateTcoSchema = z
  .object({
    price_cents: z.number().nonnegative(),
    quantity: z.number().positive().default(1),
    freight_cents: z.number().nonnegative().default(0),
    late_probability_pct: z.number().min(0).max(100).default(0),
    defect_probability_pct: z.number().min(0).max(100).default(0),
  })
  .strict();

export const p4pCalculatorSchema = z
  .object({
    direct_costs: z.number().positive('direct_costs must be a positive number'),
    overhead_pct: z.number().min(0).max(100).default(0),
    desired_margin_pct: z.number().min(0).max(100).default(0),
  })
  .strict();

export const wipaaCalculatorSchema = z
  .object({
    project_id: z.string().min(1, 'project_id is required'),
    month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be YYYY-MM'),
    work_certified: z.number().nonnegative(),
    cash_requested: z.number().nonnegative(),
  })
  .strict();

export const gonoGoDecisionSchema = z
  .object({
    estimate_cents: z.number().nonnegative(),
    baseline_cents: z.number().nonnegative(),
    deviation_threshold_pct: z.number().positive().max(100).default(10),
  })
  .strict();

// ——— Green Flag Guild C1-C5 ———

export const resourceHubSearchSchema = z
  .object({
    role: z.enum(['architect', 'qs', 'engineer', 'contractor', 'subcontractor']).optional(),
    region: z.string().min(1).optional(),
    min_rating: z.number().min(0).max(5).optional(),
    max_distance_km: z.number().positive().optional(),
    specialization: z.string().optional(),
  })
  .strict();

export const contractorMatchSchema = z
  .object({
    required_roles: z.array(z.string().min(1)).min(1),
    site_distance_km: z.number().nonnegative().optional().default(20),
    min_wipaa_health_pct: z.number().min(0).max(100).optional().default(80),
  })
  .strict();

export const vettingScorecardSchema = z
  .object({
    resource_id: z.string().min(1),
    on_time_delivery_pct: z.number().min(0).max(100),
    defect_rate_pct: z.number().min(0).max(100),
    reliability_score: z.number().min(0).max(100),
    wipaa_health_pct: z.number().min(0).max(100),
    total_projects: z.number().nonnegative(),
    credit_score: z.number().nonnegative(),
  })
  .strict();

export const costBaselineBuildSchema = z
  .object({
    project_id: z.string().min(1),
    total_budget_cents: z.number().positive(),
    contingency_pct: z.number().min(0).max(30).default(10),
    line_items: z.array(z.object({
      wbs_code: z.string().min(1),
      description: z.string().min(1),
      quantity: z.number().positive(),
      unit: z.string().min(1),
      unit_cost_cents: z.number().positive(),
      delivery_status: z.enum(['pending', 'ordered', 'delivered', 'installed']).default('pending'),
    })).min(1),
  })
  .strict();

export const valueEngineeringSchema = z
  .object({
    project_id: z.string().min(1),
    current_cost_cents: z.number().positive(),
    target_savings_pct: z.number().min(0).max(50).optional().default(5),
  })
  .strict();

export const tcoCompareSchema = z
  .object({
    quotes: z.array(z.object({
      id: z.string().min(1),
      supplier_name: z.string().min(1),
      unit_cost_cents: z.number().nonnegative(),
      quantity: z.number().positive(),
      freight_cents: z.number().nonnegative().default(0),
      lead_time_days: z.number().nonnegative(),
      on_time_delivery_pct: z.number().min(0).max(100),
      defect_rate_pct: z.number().min(0).max(100),
    })).min(1),
    base_unit_cost_cents: z.number().positive(),
  })
  .strict();

// ——— Site Hawk P1-P6 ———

export const criticalPathBuildSchema = z
  .object({
    project_id: z.string().min(1),
    tasks: z.array(z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      duration_days: z.number().positive(),
      dependencies: z.array(z.string()).default([]),
      earliest_start: z.number().nonnegative().default(0),
      resource_required: z.string().optional(),
    })).min(1),
    project_deadline_days: z.number().positive().optional(),
  })
  .strict();

export const changeOrderCreateSchema = z
  .object({
    project_id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    reason: z.enum(['owner-request', 'site-variation', 'regulation', 'error', 'other']),
    quoted_cents: z.number().positive(),
  })
  .strict();

export const wipaaSnapshotSchema = z
  .object({
    project_id: z.string().min(1),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    contract_value_cents: z.number().positive(),
    costs_incurred_cents: z.number().nonnegative(),
    total_estimated_costs_cents: z.number().positive(),
    billed_to_date_cents: z.number().nonnegative(),
  })
  .strict();

/** Registry of every tool name → its input schema. */
export const TOOL_SCHEMAS = {
  query_blaws: queryBlawsSchema,
  query_saz: querySazSchema,
  query_ziqs: queryZiqsSchema,
  query_si56: querySi56Schema,
  query_market_index: queryMarketIndexSchema,
  search_codes: searchCodesSchema,
  calculate_brick_quantity: calculateBrickQuantitySchema,
  calculate_concrete_volume: calculateConcreteVolumeSchema,
  calculate_tco: calculateTcoSchema,
  p4p_calculator: p4pCalculatorSchema,
  wipaa_calculator: wipaaCalculatorSchema,
  gono_go_decision: gonoGoDecisionSchema,
  resource_hub_search: resourceHubSearchSchema,
  contractor_match: contractorMatchSchema,
  vetting_scorecard: vettingScorecardSchema,
  cost_baseline_build: costBaselineBuildSchema,
  value_engineering: valueEngineeringSchema,
  tco_compare: tcoCompareSchema,
  critical_path_build: criticalPathBuildSchema,
  change_order_create: changeOrderCreateSchema,
  wipaa_snapshot: wipaaSnapshotSchema,
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;

export type ToolKind = 'read' | 'write' | 'decision';
export type ToolCategory = 'regulation' | 'material' | 'measurement' | 'math' | 'payment';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  type: ToolKind;
  category: ToolCategory;
  schema: z.ZodType;
}

// ————————————————————— registry —————————————————————

export const TOOLS: ToolDefinition[] = [
  { name: 'query_blaws', description: 'Query Zimbabwe Model Building By-Laws 1977 (Ch.2, Ch.4, or all). Read-only.', type: 'read', category: 'regulation', schema: queryBlawsSchema },
  { name: 'query_saz', description: 'Query SAZ material specifications (brick MPa, block sizes, tolerances). Read-only.', type: 'read', category: 'material', schema: querySazSchema },
  { name: 'query_ziqs', description: 'Query ZIQS Standard Method of Measurement rules (excavation, scaffolding, masonry, concrete). Read-only.', type: 'read', category: 'measurement', schema: queryZiqsSchema },
  { name: 'query_si56', description: 'SI 56/2025 ACZ-registration gate — check whether a plan is validated by a registered professional. Read-only.', type: 'read', category: 'regulation', schema: querySi56Schema },
  { name: 'query_market_index', description: 'Query the SADC market price index (cement, steel, brick) in USD or ZWG. Read-only.', type: 'read', category: 'material', schema: queryMarketIndexSchema },
  { name: 'search_codes', description: 'General hybrid search over the building-code RAG index (any jurisdiction, optional doc filter). Read-only.', type: 'read', category: 'regulation', schema: searchCodesSchema },
  { name: 'resource_hub_search', description: 'Search the Green Flag Guild resource hub by role, region, rating and distance. Read-only.', type: 'read', category: 'material', schema: resourceHubSearchSchema },
  { name: 'contractor_match', description: 'Rank contractors by WIPAA health, distance and reliability. Read-only.', type: 'read', category: 'measurement', schema: contractorMatchSchema },
  { name: 'calculate_brick_quantity', description: 'Math only — brick count from length, height, thickness units, bond type and wastage.', type: 'write', category: 'math', schema: calculateBrickQuantitySchema },
  { name: 'calculate_concrete_volume', description: 'Math only — concrete volume (m³) from length, width and depth.', type: 'write', category: 'math', schema: calculateConcreteVolumeSchema },
  { name: 'calculate_tco', description: 'Math only — total cost of ownership incl. freight and risk-weighted defect cost.', type: 'write', category: 'math', schema: calculateTcoSchema },
  { name: 'p4p_calculator', description: 'Math only — payment-for-progress certificate from direct costs, overhead % and desired margin %.', type: 'write', category: 'payment', schema: p4pCalculatorSchema },
  { name: 'wipaa_calculator', description: 'Math only — WIPAA revenue recognition for a project/month from work certified vs cash requested.', type: 'write', category: 'payment', schema: wipaaCalculatorSchema },
  { name: 'tco_compare', description: 'Math only — rank multiple supplier quotes by TCO with reliability and defect weighting.', type: 'write', category: 'math', schema: tcoCompareSchema },
  { name: 'vetting_scorecard', description: 'Math only — compute a contractor vetting score from delivery, defect, reliability, WIPAA and credit metrics.', type: 'write', category: 'math', schema: vettingScorecardSchema },
  { name: 'cost_baseline_build', description: 'Write — build a cost baseline from BOQ line items with contingency allocation.', type: 'write', category: 'measurement', schema: costBaselineBuildSchema },
  { name: 'value_engineering', description: 'Write — generate value engineering suggestions to meet a target savings percentage.', type: 'write', category: 'measurement', schema: valueEngineeringSchema },
  { name: 'critical_path_build', description: 'Write — compute critical path from a task network with dependencies and project deadline.', type: 'write', category: 'measurement', schema: criticalPathBuildSchema },
  { name: 'change_order_create', description: 'Write — create a change order in the variation vault with a reversal-penalty tracker.', type: 'write', category: 'payment', schema: changeOrderCreateSchema },
  { name: 'wipaa_snapshot', description: 'Write — compute a WIPAA snapshot for a project month with solvency check.', type: 'write', category: 'payment', schema: wipaaSnapshotSchema },
  { name: 'gono_go_decision', description: 'Orchestrator decision — compare an estimate against a historical baseline and produce a GO / NO-GO recommendation with deviation %. Supervisor-only.', type: 'decision', category: 'math', schema: gonoGoDecisionSchema },
];

export const READ_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'read').map((t) => t.name);
export const WRITE_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'write').map((t) => t.name);
export const DECISION_TOOLS: ToolName[] = TOOLS.filter((t) => t.type === 'decision').map((t) => t.name);

// ————————————————————— agent scoping —————————————————————

export type AgentRole = 'researcher' | 'calculator' | 'validator' | 'supervisor';

/** Read-only agents may read; the calculator may only run write/math; the supervisor holds the pen. */
export const AGENT_TOOL_SCOPES: Record<AgentRole, readonly ToolName[]> = {
  researcher: READ_TOOLS,
  validator: READ_TOOLS,
  calculator: WRITE_TOOLS,
  supervisor: DECISION_TOOLS,
};

// Extended roles for Green Flag / Site Hawk workflows
export type ExtendedRole = AgentRole | 'green-flag' | 'site-hawk';

export const EXTENDED_TOOL_SCOPES: Record<ExtendedRole, readonly ToolName[]> = {
  ...AGENT_TOOL_SCOPES,
  'green-flag': ['resource_hub_search', 'contractor_match', 'vetting_scorecard', 'cost_baseline_build', 'value_engineering', 'tco_compare', 'p4p_calculator', 'wipaa_calculator', 'calculate_brick_quantity', 'calculate_concrete_volume', 'calculate_tco', 'query_blaws', 'query_saz', 'query_ziqs', 'query_market_index', 'search_codes'],
  'site-hawk': ['critical_path_build', 'change_order_create', 'wipaa_snapshot', 'wipaa_calculator', 'p4p_calculator', 'calculate_brick_quantity', 'calculate_concrete_volume', 'query_market_index', 'search_codes', 'resource_hub_search'],
};

export function toolsForRole(role: AgentRole): readonly ToolName[] {
  return AGENT_TOOL_SCOPES[role];
}

export function canCallTool(role: AgentRole, tool: ToolName): boolean {
  return AGENT_TOOL_SCOPES[role].includes(tool);
}

/** Throws when an agent calls a tool outside its scope. Enforced at the graph boundary. */
export function assertAgentToolScope(role: AgentRole, tool: ToolName): void {
  if (!canCallTool(role, tool)) {
    throw new Error(`Agent role "${role}" is not permitted to call tool "${tool}"`);
  }
}

// ————————————————————— parse helpers —————————————————————

/** Strictly parse and validate arguments for a tool. Rejects string injection. */
export function parseToolArgs<T extends ToolName>(tool: T, args: unknown): z.infer<(typeof TOOL_SCHEMAS)[T]> {
  return TOOL_SCHEMAS[tool].parse(args);
}

/** True when the raw object parses cleanly against the tool schema. */
export function isValidToolArgs<T extends ToolName>(tool: T, args: unknown): boolean {
  return TOOL_SCHEMAS[tool].safeParse(args).success;
}
