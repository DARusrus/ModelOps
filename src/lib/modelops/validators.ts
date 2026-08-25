import { z } from 'zod';
import { NextResponse } from 'next/server';

/** Maximum allowed length for free-text string fields to prevent abuse */
const MAX_STRING_LENGTH = 5000;
const MAX_SHORT_STRING = 300;

// Helper to coerce string or array of strings into string[]
const stringOrArraySchema = z.union([
  z.array(z.string().trim().max(MAX_STRING_LENGTH)),
  z.string().trim().max(MAX_STRING_LENGTH).transform((val) => (val ? [val] : [])),
]).optional().default([]);

export const ExperimentMetadataSchema = z.object({
  model_name: z.string().trim().min(1, 'Model name is required').max(MAX_SHORT_STRING),
  version: z.string().trim().min(1, 'Version is required').max(MAX_SHORT_STRING).default('1.0.0'),
  dataset: z.string().trim().min(1, 'Dataset is required').max(MAX_SHORT_STRING),
  metrics: z.record(z.string().trim().max(MAX_SHORT_STRING), z.coerce.number()).optional().default({}),
  intended_use: z.string().trim().min(1, 'Intended use description is required').max(MAX_STRING_LENGTH),
  framework: z.string().trim().max(MAX_SHORT_STRING).optional(),
  task_type: z.string().trim().max(MAX_SHORT_STRING).optional(),
  input_shape: z.string().trim().max(MAX_SHORT_STRING).optional(),
  data_types: z.array(z.string().trim().max(MAX_SHORT_STRING)).max(50).optional().default([]),
  hyperparameters: z.record(z.string(), z.unknown()).optional(),
  limitations: stringOrArraySchema,
  risks: stringOrArraySchema,
  tests: stringOrArraySchema,
  reproducibility: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  // 9-section extended metadata
  model_type: z.string().trim().max(MAX_SHORT_STRING).optional(),
  architecture: z.string().trim().max(MAX_SHORT_STRING).optional(),
  developed_by: z.string().trim().max(MAX_SHORT_STRING).optional(),
  release_date: z.string().trim().max(MAX_SHORT_STRING).optional(),
  license: z.string().trim().max(MAX_SHORT_STRING).optional(),
  primary_uses: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  out_of_scope_uses: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  target_users: z.string().trim().max(MAX_SHORT_STRING).optional(),
  factors: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  environment: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  decision_thresholds: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  variation_approaches: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  eval_preprocessing: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  data_split: z.string().trim().max(MAX_SHORT_STRING).optional(),
  training_dataset: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  data_volume: z.string().trim().max(MAX_SHORT_STRING).optional(),
  disaggregated_results: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  subgroup_benchmarks: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  uses_sensitive_data: z.boolean().optional(),
  impacts_human_life: z.boolean().optional(),
  risks_and_harms: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  mitigations: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  recommendations: z.string().trim().max(MAX_STRING_LENGTH).optional(),
});

export type ExperimentMetadataInput = z.infer<typeof ExperimentMetadataSchema>;

/**
 * Schema for validating individual run objects in the compare endpoint.
 */
export const CompareRunInputSchema = z.object({
  model_name: z.string().trim().max(MAX_SHORT_STRING).optional(),
  version: z.string().trim().max(MAX_SHORT_STRING).optional(),
  dataset: z.string().trim().max(MAX_SHORT_STRING).optional(),
  metrics: z.record(z.string().trim().max(MAX_SHORT_STRING), z.coerce.number()).optional().default({}),
  input_shape: z.string().trim().max(MAX_SHORT_STRING).optional(),
  data_types: z.array(z.string().trim().max(MAX_SHORT_STRING)).max(50).optional(),
  intended_use: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  limitations: stringOrArraySchema,
  risks: stringOrArraySchema,
  warnings: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  tests: stringOrArraySchema,
  reproducibility: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  readiness_score: z.number().optional(),
});

export const CompareRequestSchema = z.object({
  run1: CompareRunInputSchema,
  run2: CompareRunInputSchema,
});

export type CompareRequestInput = z.infer<typeof CompareRequestSchema>;

export function validateInput(data: unknown): ExperimentMetadataInput {
  // Support legacy or shorthand "model" field by mapping it to model_name if model_name is missing
  if (typeof data === 'object' && data !== null && 'model' in data && !('model_name' in data)) {
    const raw = data as Record<string, unknown>;
    const normalizedData = {
      ...raw,
      model_name: raw.model,
    };
    return ExperimentMetadataSchema.parse(normalizedData);
  }
  return ExperimentMetadataSchema.parse(data);
}

/**
 * Creates a standardized API error response. All error responses across the
 * application follow the same structure: { success: false, error, details? }.
 */
export function createErrorResponse(
  message: string,
  status: number,
  details?: { path: string; message: string }[]
): NextResponse {
  const body: { success: false; error: string; details?: { path: string; message: string }[] } = {
    success: false,
    error: message,
  };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(body, { status });
}
