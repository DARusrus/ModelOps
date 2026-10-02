import { z } from 'zod';
import { TimestampSchema, UuidSchema } from '@/domain/modelops/api-contracts';
import { WorkflowStateSchema } from '@/domain/modelops/model-card';

export const DashboardWorkflowCountsSchema = z.object({
  draft: z.number().int().nonnegative(),
  submitted: z.number().int().nonnegative(),
  under_review: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
  changes_requested: z.number().int().nonnegative(),
}).strict();

export const DashboardEvaluationSchema = z.object({
  id: UuidSchema,
  model_name: z.string().trim().min(1).max(300),
  version: z.string().trim().min(1).max(300),
  readiness_score: z.coerce.number().min(0).max(100),
  workflow_state: WorkflowStateSchema,
  created_at: TimestampSchema,
}).strict();

export const DashboardActivityTypeSchema = z.enum([
  'organization_created',
  'model_card_created',
  'model_card_attested',
  'organization_invitation_created',
  'organization_invitation_renewed',
  'organization_invitation_revoked',
  'organization_invitation_accepted',
  'organization_member_role_changed',
  'organization_member_removed',
]);

export const DashboardActivitySchema = z.object({
  id: UuidSchema,
  event_type: DashboardActivityTypeSchema,
  actor_is_current_user: z.boolean(),
  card_id: UuidSchema.nullable(),
  review_action: WorkflowStateSchema.exclude(['draft']).nullable(),
  created_at: TimestampSchema,
}).strict();

export const DashboardSnapshotSchema = z.object({
  active_evaluations: z.number().int().nonnegative(),
  review_required: z.number().int().nonnegative(),
  workflow_counts: DashboardWorkflowCountsSchema,
  recent_evaluations: z.array(DashboardEvaluationSchema).max(10),
  recent_activity: z.array(DashboardActivitySchema).max(10),
}).strict();

export const DashboardResponseSchema = z.object({
  success: z.literal(true),
  dashboard: DashboardSnapshotSchema,
}).strict();

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;
export type DashboardSnapshot = z.infer<typeof DashboardSnapshotSchema>;
export type DashboardActivity = z.infer<typeof DashboardActivitySchema>;
