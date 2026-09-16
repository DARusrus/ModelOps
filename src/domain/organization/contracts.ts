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
