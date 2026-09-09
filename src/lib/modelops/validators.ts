import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiErrorBodySchema, type ApiErrorBody, type ApiErrorCode } from '@/domain/modelops/errors';
export {
  CompareRequestSchema,
  ExperimentMetadataSchema,
  type CompareRequestInput,
  type ExperimentMetadataInput,
} from '@/domain/modelops/api-contracts';
import { ExperimentMetadataSchema, type ExperimentMetadataInput } from '@/domain/modelops/api-contracts';

export function validateInput(data: unknown): ExperimentMetadataInput {
  // Support legacy or shorthand "model" field by mapping it to model_name if model_name is missing
  if (typeof data === 'object' && data !== null && 'model' in data && !('model_name' in data)) {
    const raw = data as Record<string, unknown>;
    const normalizedData = {
      ...raw,
      model_name: raw.model,
    };
    delete (normalizedData as Record<string, unknown>).model;
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
  details?: { path: string; message: string }[],
  code: ApiErrorCode = 'INTERNAL_ERROR'
): NextResponse {
  const body: ApiErrorBody = {
    success: false,
    code,
    error: message,
  };
  if (details) {
    body.details = details;
  }
  return NextResponse.json(ApiErrorBodySchema.parse(body), { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Parse every successful JSON body before it crosses an API boundary. */
export function createSuccessResponse<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  status = 200,
  headers: HeadersInit = {},
): NextResponse<z.output<T>> {
  return NextResponse.json(schema.parse(body), {
    status,
    headers: { 'Cache-Control': 'no-store', ...headers },
  });
}
