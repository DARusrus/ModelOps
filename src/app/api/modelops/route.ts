import { NextResponse } from 'next/server';
import { validateInput, createErrorResponse } from '@/lib/modelops/validators';
import { processModelOpsRequest } from '@/lib/modelops/service';
import { ZodError } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (isRateLimited(ip, { windowMs: 60000, maxRequests: 30 })) {
      return createErrorResponse('Too Many Requests. Please try again later.', 429);
    }

    // Diagnostic Simulation headers for E2E testing
    if (request.headers.get('x-simulate-error') === 'true') {
      return createErrorResponse('Simulated upstream AI provider service failure (503)', 503);
    }

    if (request.headers.get('x-simulate-empty') === 'true') {
      return createErrorResponse('No matching model card found', 404);
    }

    const rawBody = await request.json().catch(() => null);

    if (!rawBody) {
      return createErrorResponse('Invalid JSON payload provided in request body', 400);
    }

    // 1. Zod input validation
    const validatedInput = validateInput(rawBody);

    // 2. Extract BYOK headers
    const groqApiKey = request.headers.get('x-groq-api-key') || undefined;
    const geminiApiKey = request.headers.get('x-gemini-api-key') || undefined;
    const preferredProvider = request.headers.get('x-preferred-provider') || undefined;

    // 3. Pass to service orchestrator with user options
    const result = await processModelOpsRequest(validatedInput, {
      groqApiKey,
      geminiApiKey,
      preferredProvider,
    });

    // 4. Return top-level ModelCardOutput (as expected by client and test suite)
    return NextResponse.json(result);
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
