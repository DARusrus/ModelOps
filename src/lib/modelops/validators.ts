import { z } from 'zod';
import { NextResponse } from 'next/server';

/** Maximum allowed length for free-text string fields to prevent abuse */
const MAX_STRING_LENGTH = 2000;
const MAX_SHORT_STRING = 200;

export const ExperimentMetadataSchema = z.object({
  model_name: z.string().trim().min(1, 'Model name is required').max(MAX_SHORT_STRING),
  version: z.string().trim().min(1, 'Version is required').max(MAX_SHORT_STRING).default('1.0.0'),
  dataset: z.string().trim().min(1, 'Dataset is required').max(MAX_SHORT_STRING),
  metrics: z.record(z.string().trim().max(MAX_SHORT_STRING), z.coerce.number()).optional().default({}),
  intended_use: z.string().trim().min(1, 'Intended use description is required').max(MAX_STRING_LENGTH),
  framework: z.string().trim().max(MAX_SHORT_STRING).optional(),
  task_type: z.string().trim().max(MAX_SHORT_STRING).optional(),
  input_shape: z.string().trim().max(MAX_SHORT_STRING).optional(),
  data_types: z.array(z.string().trim().max(MAX_SHORT_STRING)).max(50).optional(),
  hyperparameters: z.record(z.string(), z.unknown()).optional(),
  limitations: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  risks: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  tests: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  reproducibility: z.string().trim().max(MAX_STRING_LENGTH).optional(),
});

export type ExperimentMetadataInput = z.infer<typeof ExperimentMetadataSchema>;

/**
 * Schema for validating individual run objects in the compare endpoint.
 * Only requires fields that compare_runs() actually uses.
 */
export const CompareRunInputSchema = z.object({
  model_name: z.string().trim().max(MAX_SHORT_STRING).optional(),
  version: z.string().trim().max(MAX_SHORT_STRING).optional(),
  dataset: z.string().trim().max(MAX_SHORT_STRING).optional(),
  metrics: z.record(z.string().trim().max(MAX_SHORT_STRING), z.coerce.number()).optional().default({}),
  input_shape: z.string().trim().max(MAX_SHORT_STRING).optional(),
  data_types: z.array(z.string().trim().max(MAX_SHORT_STRING)).max(50).optional(),
  intended_use: z.string().trim().max(MAX_STRING_LENGTH).optional(),
  limitations: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  risks: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  warnings: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  tests: z.array(z.string().trim().max(MAX_STRING_LENGTH)).max(50).optional(),
  reproducibility: z.string().trim().max(MAX_STRING_LENGTH).optional(),
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
