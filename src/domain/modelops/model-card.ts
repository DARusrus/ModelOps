import { z } from 'zod';
import { EvidenceItemSchema } from './evidence';
import { SuggestionSetSchema } from './suggestion';

export const WorkflowStateSchema = z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected', 'changes_requested']);
export const DataClassificationSchema = z.enum(['unclassified', 'public', 'internal', 'confidential', 'restricted']);

export const ModelCardMetadataSchema = z.object({
  model_type: z.string().optional(), architecture: z.string().optional(), developed_by: z.string().optional(), release_date: z.string().optional(), license: z.string().optional(),
  primary_uses: z.string().optional(), out_of_scope_uses: z.string().optional(), target_users: z.string().optional(), factors: z.string().optional(), environment: z.string().optional(),
  decision_thresholds: z.string().optional(), variation_approaches: z.string().optional(), eval_preprocessing: z.string().optional(), data_split: z.string().optional(), training_dataset: z.string().optional(), data_volume: z.string().optional(),
  disaggregated_results: z.string().optional(), subgroup_benchmarks: z.string().optional(), data_classification: DataClassificationSchema.optional(), uses_sensitive_data: z.boolean().optional(), impacts_human_life: z.boolean().optional(), risks_and_harms: z.string().optional(), mitigations: z.string().optional(), recommendations: z.string().optional(), generated_at: z.string().optional(), provider: z.string().optional(),
}).strict();

export const ModelCardOutputSchema = z.object({
  record_id: z.string().uuid().optional(),
  model_name: z.string().min(1),
  version: z.string().min(1),
  dataset: z.string().min(1),
  experiment_info: z.string().default('No experiment details recorded'),
  input_shape: z.string().default('Not specified'),
  data_types: z.array(z.string()).default([]),
  distribution_summary: z.string().default('Distribution data not provided'),
  metrics: z.record(z.string(), z.coerce.number()).default({}),
  intended_use: z.string().default('General evaluation'),
  framework: z.string().optional(),
  task_type: z.string().optional(),
  metadata: ModelCardMetadataSchema.optional(),
  warnings: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  tests: z.array(z.string()).default([]),
  reproducibility: z.string().default('Standard execution pipeline'),
  readiness_score: z.number().min(0).max(100),
  ai_analysis: z.string().default(''),
  detected_issues: z.array(z.string()).default([]),
  error_reasons: z.array(z.string()).default([]),
  suggested_fixes: z.array(z.string()).default([]),
  next_steps: z.array(z.string()).default([]),
  references: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  evidence_items: z.array(EvidenceItemSchema).default([]),
  ai_suggestions: SuggestionSetSchema.default({ status: 'deterministic_only', prompt_template_version: '2026-09-04.1', items: [] }),
  rubric_version: z.string().default('legacy'),
  score_breakdown: z.record(z.string(), z.number()).default({}),
  workflow_state: WorkflowStateSchema.optional(),
  decision: z.literal('pending_human_review').default('pending_human_review'),
});

type ModelCardSchemaInput = z.input<typeof ModelCardOutputSchema>;
type ModelCardSchemaOutput = z.output<typeof ModelCardOutputSchema>;

/**
 * Application DTO: callers may supply sparse deterministic-card fields, while
 * parsing at persistence and API boundaries materializes all schema defaults.
 */
export type ModelCardOutput = ModelCardSchemaInput & Pick<ModelCardSchemaOutput,
  'model_name' | 'version' | 'dataset' | 'metrics' | 'intended_use' | 'readiness_score' | 'decision'>;
