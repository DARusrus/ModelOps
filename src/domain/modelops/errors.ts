import { z } from 'zod';

export const ApiErrorCodeSchema = z.enum([
  'INVALID_JSON', 'UNSUPPORTED_MEDIA_TYPE', 'PAYLOAD_TOO_LARGE', 'INVALID_CURSOR',
  'VALIDATION_FAILED', 'RATE_LIMITED', 'SELF_APPROVAL_FORBIDDEN',
  'IDEMPOTENCY_REQUIRED', 'IDEMPOTENCY_CONFLICT', 'OPERATION_IN_PROGRESS',
  'INTERNAL_ERROR',
]);
export const ApiErrorBodySchema = z.object({
  success: z.literal(false),
  code: ApiErrorCodeSchema,
  error: z.string(),
  details: z.array(z.object({ path: z.string(), message: z.string() }).strict()).optional(),
}).strict();

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type ApiErrorBody = z.infer<typeof ApiErrorBodySchema>;
