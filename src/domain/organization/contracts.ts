import { z } from 'zod';

export const WorkspaceNameSchema = z.string().trim().min(1, 'Workspace name is required').max(120, 'Workspace name must be 120 characters or fewer').refine(
  (value) => !/[\u0000-\u001f\u007f]/.test(value),
  'Workspace name contains unsupported control characters',
);

export const CreateWorkspaceRequestSchema = z.object({ workspace_name: WorkspaceNameSchema }).strict();

export const CreateWorkspaceRpcRowSchema = z.object({
  organization_id: z.string().uuid(),
  organization_name: WorkspaceNameSchema,
  organization_role: z.literal('admin'),
  created: z.boolean(),
}).strict();

export const CreateWorkspaceResponseSchema = z.object({
  success: z.literal(true),
  organization_id: z.string().uuid(),
  name: WorkspaceNameSchema,
  role: z.literal('admin'),
  created: z.boolean(),
}).strict();

export const OrganizationRoleSchema = z.enum(['viewer', 'editor', 'reviewer', 'admin']);
export const InvitationEmailSchema = z.string().trim().email('Enter a valid email address').max(320).transform((value) => value.toLowerCase());
export const InvitationIdSchema = z.string().uuid();

export type OrganizationRole = z.infer<typeof OrganizationRoleSchema>;

export const CreateInvitationRequestSchema = z.object({
  email: InvitationEmailSchema,
  role: OrganizationRoleSchema,
}).strict();

export const InvitationActionRequestSchema = z.object({ action: z.literal('resend') }).strict();
export const UpdateMemberRoleRequestSchema = z.object({ role: OrganizationRoleSchema }).strict();

export const InvitationSchema = z.object({
  id: InvitationIdSchema,
  email: InvitationEmailSchema,
  role: OrganizationRoleSchema,
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
  expires_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
  acceptance_url: z.string().url(),
}).strict();

export const InvitationRecordSchema = InvitationSchema.omit({ acceptance_url: true });
export type OrganizationInvitation = z.infer<typeof InvitationSchema>;

export const InvitationRpcRowSchema = z.object({
  invitation_id: InvitationIdSchema,
  invitation_email: InvitationEmailSchema,
  invitation_role: OrganizationRoleSchema,
  invitation_expires_at: z.string().datetime({ offset: true }),
  invitation_created_at: z.string().datetime({ offset: true }),
  recipient_exists: z.boolean(),
}).strict();

export const InvitationListResponseSchema = z.object({
  success: z.literal(true),
  invitations: z.array(InvitationSchema),
}).strict();

export const InvitationMutationResponseSchema = z.object({
  success: z.literal(true),
  invitation: InvitationSchema,
  delivery: z.enum(['sent', 'manual_required']),
}).strict();

export const InvitationRevocationResponseSchema = z.object({
  success: z.literal(true),
  invitation_id: z.string().uuid(),
}).strict();

export const InvitationAcceptanceRpcSchema = z.object({
  organization_id: z.string().uuid(),
  organization_name: WorkspaceNameSchema,
  organization_role: OrganizationRoleSchema,
  accepted: z.boolean(),
}).strict();

export const InvitationAcceptanceResponseSchema = z.object({
  success: z.literal(true),
  organization_id: z.string().uuid(),
  organization_name: WorkspaceNameSchema,
  role: OrganizationRoleSchema,
  accepted: z.boolean(),
}).strict();

export const OrganizationMemberSchema = z.object({
  user_id: z.string().uuid(),
  email: InvitationEmailSchema,
  role: OrganizationRoleSchema,
  created_at: z.string().datetime({ offset: true }),
  is_current_user: z.boolean(),
}).strict();

export const OrganizationMemberRecordSchema = OrganizationMemberSchema.omit({ is_current_user: true });
export type OrganizationMember = z.infer<typeof OrganizationMemberSchema>;

export const OrganizationMemberListResponseSchema = z.object({
  success: z.literal(true),
  members: z.array(OrganizationMemberSchema),
}).strict();

export const OrganizationMemberMutationResponseSchema = z.object({
  success: z.literal(true),
  user_id: z.string().uuid(),
  role: OrganizationRoleSchema.optional(),
}).strict();
