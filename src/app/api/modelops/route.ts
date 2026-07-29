import { NextResponse } from 'next/server';
import { validateInput, createErrorResponse } from '@/lib/modelops/validators';
import { processModelOpsRequest } from '@/lib/modelops/service';
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

    if (!rawBody) {
      return createErrorResponse('Invalid JSON payload provided in request body', 400);
    }

    // 1. Zod input validation
    const validatedInput = validateInput(rawBody);

    const startTime = Date.now();
    // 2. Pass to service orchestrator
    const result = await processModelOpsRequest(validatedInput);
    const processingTime = Date.now() - startTime;
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomUUID();

    // Extract recommendations/metadata based on the new service response
    const recommendations = [...result.data.next_steps, ...result.data.suggested_fixes];
    const metadata = {
      model_name: validatedInput.model_name,
      version: validatedInput.version,
      dataset: validatedInput.dataset,
    };

    // 3. Return structured enterprise output
    return NextResponse.json({
      success: true,
      provider: result.provider,
      processing_time: `${processingTime}ms`,
      request_id: requestId,
      timestamp,
      data: result.data,
      readiness: result.readiness,
      risk: result.risk,
      recommendations,
      metadata,
      ...(result.provider === 'fallback' && { warning: 'AI providers unavailable. Deterministic fallback used.' }),
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return createErrorResponse(
        'Input validation failed',
        400,
        error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
      );
    }

    logger.error('[API /api/modelops] Server Error:', error);
    return createErrorResponse('Internal Server Error', 500);
  }
}
