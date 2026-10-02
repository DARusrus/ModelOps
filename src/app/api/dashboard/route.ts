import { ZodError } from 'zod';
import { DashboardResponseSchema, DashboardSnapshotSchema } from '@/domain/dashboard/contracts';
import { requireDefaultActor } from '@/lib/auth/actor';
import { withRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';
import { createErrorResponse, createSuccessResponse } from '@/lib/modelops/validators';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function get() {
  try {
    const actor = await requireDefaultActor('read');
    const { data, error } = await createSupabaseAdminClient().rpc('get_dashboard_snapshot_as', {
      requesting_actor: actor.userId,
      target_organization: actor.organizationId,
      recent_limit: 5,
    });
    if (error || !data) {
      logger.warn('[API /api/dashboard] Dashboard query failed', { code: error?.code });
      return createErrorResponse('Dashboard could not be loaded', 503);
    }
    const dashboard = DashboardSnapshotSchema.parse(data);
    return createSuccessResponse(DashboardResponseSchema, { success: true, dashboard });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return createErrorResponse('Authentication is required', 401, undefined, 'UNAUTHENTICATED');
    }
    if (error instanceof Error && ['FORBIDDEN', 'ORGANIZATION_SELECTION_REQUIRED'].includes(error.message)) {
      return createErrorResponse('You are not authorized for this organization', 403, undefined, 'FORBIDDEN');
    }
    if (error instanceof ZodError) {
      logger.error('[API /api/dashboard] Dashboard contract violation');
      return createErrorResponse('Dashboard data could not be validated', 500, undefined, 'INTERNAL_ERROR');
    }
    logger.error('[API /api/dashboard] Dashboard read failed', { error_type: error instanceof Error ? error.name : 'UNKNOWN' });
    return createErrorResponse('Dashboard could not be loaded', 500, undefined, 'INTERNAL_ERROR');
  }
}

export const GET = withRequestId(get);
