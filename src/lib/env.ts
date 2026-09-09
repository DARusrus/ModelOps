import { z } from 'zod';

/**
 * Provider credentials are optional because deterministic evaluation is a valid
 * product mode.  They must never be replaced with plausible-looking mock keys:
 * doing so turns a missing configuration into an unintended external request.
 */
const optionalSecret = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional()
);

const envSchema = z.object({
  GROQ_API_KEY: optionalSecret,
  GEMINI_API_KEY: optionalSecret,
  // External model providers are opt-in. A configured key alone must never
  // cause potentially sensitive governance evidence to leave this service.
  AI_EGRESS_MODE: z.enum(['disabled', 'non_sensitive_only']).default('disabled'),
  AI_PROVIDER_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(8_000),
  // Global shared bulkhead; tune from measured production traffic, never from
  // browser input. The default remains deliberately conservative.
  AI_PROVIDER_MAX_CONCURRENCY: z.coerce.number().int().min(1).max(64).default(4),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(`Invalid server configuration: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
}

export const env = parsed.data;
