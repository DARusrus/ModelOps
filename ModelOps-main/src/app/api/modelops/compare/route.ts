import { NextResponse } from 'next/server';
import { compare_runs } from '@/lib/modelops/tools';
import { CompareRequestSchema, createErrorResponse } from '@/lib/modelops/validators';
import { ZodError } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip, { windowMs: 60000, maxRequests: 20 })) {
      return createErrorResponse('Too Many Requests. Please try again later.', 429);
    }

    const rawBody = await request.json().catch(() => null);

    if (!rawBody || typeof rawBody !== 'object') {
      return createErrorResponse('Invalid JSON payload provided in request body', 400);
    }

    // Zod schema validation for both run objects
    const { run1, run2 } = CompareRequestSchema.parse(rawBody);

    const comparisonResult = compare_runs(run1, run2);

    return NextResponse.json({
      success: true,
      comparison: comparisonResult,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        'Input validation failed',
        400,
        error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      );
    }

    logger.error('[API /api/modelops/compare] Server Error:', error);
    return createErrorResponse(
      'An internal server error occurred while comparing experiment runs.',
      500
    );
  }
}
