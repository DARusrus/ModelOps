import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { withRequestId } from '@/lib/http';
import { createSuccessResponse } from '@/lib/modelops/validators';
import { HealthResponseSchema, UnavailableHealthResponseSchema } from '@/domain/modelops/api-contracts';
import { env } from '@/lib/env';
import { createAsyncTtlCache } from '@/lib/health/async-ttl-cache';

export const dynamic = 'force-dynamic';

type DatabaseReadiness = 'ok' | 'unavailable';

const readDatabaseStatus = createAsyncTtlCache<DatabaseReadiness>(async () => {
  try {
    const database = createSupabaseAdminClient();
    const { error } = await database.from('organizations').select('id', { head: true }).limit(1);
    if (error) throw new Error('DATABASE_UNAVAILABLE');
    return 'ok';
  } catch (error) {
    logger.error('[API /api/health] Readiness check failed', { error_type: error instanceof Error ? error.message : 'UNKNOWN' });
    return 'unavailable';
  }
}, env.HEALTH_CACHE_TTL_MS);

async function get() {
  const startedAt = Date.now();
  try {
    const databaseStatus = await readDatabaseStatus();
    if (databaseStatus !== 'ok') {
      return createSuccessResponse(UnavailableHealthResponseSchema, { status: 'unavailable', checks: { database: 'unavailable' } }, 503);
    }
    return createSuccessResponse(HealthResponseSchema, { status: 'ok', checks: { database: 'ok' } });
  } catch (error) {
    logger.error('[API /api/health] Readiness handler failed', { error_type: error instanceof Error ? error.message : 'UNKNOWN' });
    return createSuccessResponse(UnavailableHealthResponseSchema, { status: 'unavailable', checks: { database: 'unavailable' } }, 503);
  } finally {
    logger.info('[API /api/health] Readiness check completed', { duration_ms: Date.now() - startedAt });
  }
}

export const GET = withRequestId(get);
