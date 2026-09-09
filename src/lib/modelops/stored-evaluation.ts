import { z } from 'zod';
import { ModelCardOutputSchema } from '@/domain/modelops/model-card';

const StoredEvaluationSchema = z.object({
  id: z.string().uuid(),
  payload: ModelCardOutputSchema,
  // Postgres emits RFC 3339 timestamps with a numeric UTC offset (+00:00),
  // which is valid but not the Z-only form Zod accepts by default.
  created_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
});

export type StoredEvaluation = z.infer<typeof StoredEvaluationSchema>;

const StoredEvaluationSummarySchema = z.object({
  id: z.string().uuid(),
  model_name: z.string().min(1),
  model_version: z.string().min(1),
  readiness_score: z.coerce.number().min(0).max(100),
  created_at: z.string().datetime({ offset: true }),
  expires_at: z.string().datetime({ offset: true }),
});

export type StoredEvaluationSummary = z.infer<typeof StoredEvaluationSummarySchema>;

export function parseStoredEvaluations(value: unknown): StoredEvaluation[] {
  return z.array(StoredEvaluationSchema).parse(value);
}

export function parseStoredEvaluationSummaries(value: unknown): StoredEvaluationSummary[] {
  return z.array(StoredEvaluationSummarySchema).parse(value);
}
