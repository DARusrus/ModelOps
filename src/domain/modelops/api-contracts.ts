import { z } from 'zod';
import { EvidenceItemSchema } from './evidence';
import { ModelCardOutputSchema, WorkflowStateSchema } from './model-card';

const MAX_STRING_LENGTH = 5000;
const MAX_SHORT_STRING = 300;
const MAX_METRICS = 30;
const MAX_HYPERPARAMETERS = 30;
const finiteNumber = z.coerce.number().finite().min(-1_000_000_000).max(1_000_000_000);
const boundedRecord = <T extends z.ZodTypeAny>(value: T, maxEntries: number) =>
  z.record(z.string().trim().min(1).max(MAX_SHORT_STRING), value).refine(
    (record) => Object.keys(record).length <= maxEntries,
    `At most ${maxEntries} entries are allowed`,
  );
const stringOrArray = z.union([
  z.array(z.string().trim().max(MAX_STRING_LENGTH)),
  z.string().trim().max(MAX_STRING_LENGTH).transform((value) => value ? [value] : []),
]).optional().default([]);

export const UuidSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime({ offset: true });
export const GovernancePolicyIdSchema = z.enum(['healthcare_ai', 'fin_fraud_ai', 'genai_llm_ai', 'cv_edge_ai', 'enterprise_general']);
export const ReviewModeSchema = z.enum(['self_attestation', 'independent_review']);

/** Request body for creating a model-card evaluation. */
export const ExperimentMetadataSchema = z.object({
  model_name: z.string().trim().min(1, 'Model name is required').max(MAX_SHORT_STRING),
  version: z.string().trim().min(1, 'Version is required').max(MAX_SHORT_STRING).default('1.0.0'),
  dataset: z.string().trim().min(1, 'Dataset is required').max(MAX_SHORT_STRING),
  metrics: boundedRecord(finiteNumber, MAX_METRICS).optional().default({}),
  intended_use: z.string().trim().min(1, 'Intended use description is required').max(MAX_STRING_LENGTH),
  framework: z.string().trim().max(MAX_SHORT_STRING).optional(),
  task_type: z.string().trim().max(MAX_SHORT_STRING).optional(),
  input_shape: z.string().trim().max(MAX_SHORT_STRING).optional(),
  data_types: z.array(z.string().trim().max(MAX_SHORT_STRING)).max(50).optional().default([]),
  hyperparameters: boundedRecord(z.union([z.string().trim().max(MAX_STRING_LENGTH), finiteNumber, z.boolean()]), MAX_HYPERPARAMETERS).optional(),
  limitations: stringOrArray,
  risks: stringOrArray,
  tests: stringOrArray,
  reproducibility: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  model_type: z.string().trim().max(MAX_SHORT_STRING).optional(), architecture: z.string().trim().max(MAX_SHORT_STRING).optional(), developed_by: z.string().trim().max(MAX_SHORT_STRING).optional(), release_date: z.string().trim().max(MAX_SHORT_STRING).optional(), license: z.string().trim().max(MAX_SHORT_STRING).optional(),
  primary_uses: z.string().trim().max(MAX_STRING_LENGTH).optional(), out_of_scope_uses: z.string().trim().max(MAX_STRING_LENGTH).optional(), target_users: z.string().trim().max(MAX_SHORT_STRING).optional(), factors: z.string().trim().max(MAX_STRING_LENGTH).optional(), environment: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  decision_thresholds: z.string().trim().max(MAX_STRING_LENGTH).optional(), variation_approaches: z.string().trim().max(MAX_STRING_LENGTH).optional(), eval_preprocessing: z.string().trim().max(MAX_STRING_LENGTH).optional(), data_split: z.string().trim().max(MAX_SHORT_STRING).optional(), training_dataset: z.string().trim().max(MAX_STRING_LENGTH).optional(), data_volume: z.string().trim().max(MAX_SHORT_STRING).optional(),
  disaggregated_results: z.string().trim().max(MAX_STRING_LENGTH).optional(), subgroup_benchmarks: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  data_classification: z.enum(['unclassified', 'public', 'internal', 'confidential', 'restricted']).default('unclassified'),
  uses_sensitive_data: z.boolean().optional(), impacts_human_life: z.boolean().optional(), risks_and_harms: z.string().trim().max(MAX_STRING_LENGTH).optional(), mitigations: z.string().trim().max(MAX_STRING_LENGTH).optional(), recommendations: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  evidence_items: z.array(EvidenceItemSchema).max(100).optional().default([]),
}).strict();
export type ExperimentMetadataInput = z.infer<typeof ExperimentMetadataSchema>;

export const CompareRequestSchema = z.object({ baseline_id: UuidSchema, candidate_id: UuidSchema }).strict();
export type CompareRequestInput = z.infer<typeof CompareRequestSchema>;
export const ReviewRequestSchema = z.object({
  action: WorkflowStateSchema.exclude(['draft']),
  reason: z.string().trim().min(1).max(2000),
  policy_id: GovernancePolicyIdSchema,
}).strict();
export const OrganizationSelectionRequestSchema = z.object({ organization_id: UuidSchema }).strict();
export const GovernanceUpdateRequestSchema = z.object({ review_mode: ReviewModeSchema }).strict();

export const MetricDiffSchema = z.object({
  metric_name: z.string(), run1_value: z.number(), run2_value: z.number(), delta: z.number(),
  direction: z.enum(['improved', 'degraded', 'unchanged']),
  comparison_status: z.enum(['comparable', 'not_measured', 'incompatible_unit', 'different_dataset', 'not_comparable']).optional(),
  unit: z.string().optional(), reason: z.string().optional(),
}).strict();
export type MetricDiff = z.infer<typeof MetricDiffSchema>;
export const CompareRunsOutputSchema = z.object({
  model_name_1: z.string(), version_1: z.string(), model_name_2: z.string(), version_2: z.string(),
  metrics_diff: z.array(MetricDiffSchema), readiness_score_1: z.number(), readiness_score_2: z.number(), readiness_delta: z.number(), summary: z.array(z.string()),
}).strict();

export const EvaluationSummarySchema = z.object({
  id: UuidSchema, model_name: z.string().min(1), version: z.string().min(1), readiness_score: z.number().min(0).max(100), created_at: TimestampSchema, expires_at: TimestampSchema,
}).strict();
export const EvaluationListResponseSchema = z.object({
  success: z.literal(true), evaluations: z.array(EvaluationSummarySchema), page_size: z.number().int().min(1).max(50), has_more: z.boolean(), next_cursor: z.string().nullable(),
}).strict();
export const EvaluationCreateResponseSchema = ModelCardOutputSchema.extend({ record_id: UuidSchema }).strict();
export const EvaluationDetailSchema = ModelCardOutputSchema.extend({ id: UuidSchema, workflow_state: WorkflowStateSchema, created_at: TimestampSchema, expires_at: TimestampSchema }).strict();
export const EvaluationDetailResponseSchema = z.object({ success: z.literal(true), evaluation: EvaluationDetailSchema }).strict();
export const ComparisonResponseSchema = z.object({ success: z.literal(true), comparison: CompareRunsOutputSchema }).strict();

export const PolicySchema = z.object({
  id: GovernancePolicyIdSchema, name: z.string(), domain: z.string(), min_score: z.number().min(0).max(100), description: z.string(), mandatory_rules: z.array(z.string()),
}).strict();
export const PolicyEvaluationSchema = z.object({
  policy: PolicySchema, isPassed: z.boolean(), scoreDelta: z.number(), unmetRules: z.array(z.string()), statusText: z.enum(['POLICY_PASSED', 'POLICY_BLOCKED']), justification: z.string(),
}).strict();
export const ReviewAttestationSchema = z.object({
  id: UuidSchema, action: WorkflowStateSchema.exclude(['draft']), reason: z.string(), rubric_version: z.string(), policy_id: GovernancePolicyIdSchema,
  previous_digest: z.string().nullable(), digest: z.string(), sequence_no: z.number().int().positive(), digest_version: z.enum(['legacy_unverifiable', 'v2']), created_at: TimestampSchema,
}).strict();
/**
 * Database RPC rows contain internal tenancy, actor, evidence, and retention
 * fields. Public API responses deliberately expose only this review ledger's
 * display and verification fields.
 */
export function parseReviewAttestation(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ReviewAttestationSchema.parse(value);
  }
  const row = value as Record<string, unknown>;
  return ReviewAttestationSchema.parse({
    id: row.id,
    action: row.action,
    reason: row.reason,
    rubric_version: row.rubric_version,
    policy_id: row.policy_id,
    previous_digest: row.previous_digest,
    digest: row.digest,
    sequence_no: row.sequence_no,
    digest_version: row.digest_version,
    created_at: row.created_at,
  });
}
export const ReviewResponseSchema = z.object({ success: z.literal(true), attestation: ReviewAttestationSchema, workflow_state: WorkflowStateSchema.exclude(['draft']), policy: PolicyEvaluationSchema }).strict();
export const PolicyBlockedResponseSchema = z.object({ success: z.literal(false), code: z.literal('POLICY_BLOCKED'), error: z.string(), policy: PolicyEvaluationSchema }).strict();
export const ReviewIntegritySchema = z.object({ valid: z.boolean().nullable(), checked_events: z.number().int().nonnegative(), reason: z.string().optional() }).strict();
export const ReviewHistoryResponseSchema = z.object({ success: z.literal(true), workflow_state: WorkflowStateSchema, governance_policy_id: GovernancePolicyIdSchema.nullable(), history: z.array(ReviewAttestationSchema), integrity: ReviewIntegritySchema }).strict();

export const OrganizationMembershipSchema = z.object({ organization_id: UuidSchema, role: z.enum(['viewer', 'editor', 'reviewer', 'admin']), name: z.string() }).strict();
export const ActiveOrganizationsResponseSchema = z.object({ success: z.literal(true), organizations: z.array(OrganizationMembershipSchema) }).strict();
export const ActiveOrganizationResponseSchema = z.object({ success: z.literal(true), organization_id: UuidSchema }).strict();
export const GovernanceResponseSchema = z.object({ success: z.literal(true), review_mode: ReviewModeSchema, can_manage: z.boolean() }).strict();
export const GovernanceUpdateResponseSchema = z.object({ success: z.literal(true), review_mode: ReviewModeSchema }).strict();
export const HealthResponseSchema = z.object({ status: z.literal('ok'), checks: z.object({ database: z.literal('ok') }).strict() }).strict();
export const UnavailableHealthResponseSchema = z.object({ status: z.literal('unavailable'), checks: z.object({ database: z.literal('unavailable') }).strict() }).strict();

export const ExportedModelCardSchema = z.object({
  id: UuidSchema, organization_id: UuidSchema, payload: ModelCardOutputSchema, readiness_score: z.number().min(0).max(100), rubric_version: z.string(), workflow_state: WorkflowStateSchema, governance_policy_id: GovernancePolicyIdSchema.nullable(), created_at: TimestampSchema, expires_at: TimestampSchema,
}).strict();
export const GovernanceExportSchema = z.object({
  schema_version: z.literal('modelops-governance-export/1'), exported_at: TimestampSchema, model_card: ExportedModelCardSchema, review_history: z.array(ReviewAttestationSchema),
}).strict();

export type CompareRunsOutput = z.infer<typeof CompareRunsOutputSchema>;
