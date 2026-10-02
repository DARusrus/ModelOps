import { z } from 'zod';
import { TimestampSchema, UuidSchema } from '@/domain/modelops/api-contracts';

export const ReviewQueueStateSchema = z.enum(['submitted', 'under_review']);
export const ReviewQueueFilterSchema = z.enum(['all', 'submitted', 'under_review']);
export type ReviewQueueFilter = z.infer<typeof ReviewQueueFilterSchema>;

export const ReviewQueueQuerySchema = z.object({
  state: ReviewQueueFilterSchema.default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(512).optional(),
}).strict();

export type ReviewQueueQuery = z.infer<typeof ReviewQueueQuerySchema>;

export const ReviewQueueItemSchema = z.object({
  id: UuidSchema,
  model_name: z.string().trim().min(1).max(300),
  version: z.string().trim().min(1).max(300),
  readiness_score: z.coerce.number().min(0).max(100),
  workflow_state: ReviewQueueStateSchema,
  author_email: z.string().email().max(320),
  created_at: TimestampSchema,
  last_review_at: TimestampSchema.nullable(),
}).strict();

export const ReviewQueueRpcRowsSchema = z.array(ReviewQueueItemSchema).max(51);

export const ReviewQueueResponseSchema = z.object({
  success: z.literal(true),
  reviews: z.array(ReviewQueueItemSchema).max(50),
  page_size: z.number().int().min(1).max(50),
  has_more: z.boolean(),
  next_cursor: z.string().nullable(),
}).strict();

export type ReviewQueueItem = z.infer<typeof ReviewQueueItemSchema>;
export type ReviewQueueResponse = z.infer<typeof ReviewQueueResponseSchema>;
