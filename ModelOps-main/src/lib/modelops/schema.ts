import { z } from 'zod';

export const ModelCardOutputSchema = z.object({
  model_name: z.string().min(1),
  version: z.string().min(1),
  dataset: z.string().min(1),
  experiment_info: z.string().default('No experiment details recorded'),
  input_shape: z.string().default('Not specified'),
  data_types: z.array(z.string()).default([]),
  distribution_summary: z.string().default('Distribution data not provided'),
  metrics: z.record(z.string(), z.coerce.number()).default({}),
  intended_use: z.string().default('General evaluation'),
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
  decision: z.string().default('pending_human_review'),
});

export type ModelCardOutput = z.infer<typeof ModelCardOutputSchema>;


