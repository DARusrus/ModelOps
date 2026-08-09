import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
});

// If we are in the test environment, fallback to dummy keys so imports don't fail
const isTest = process.env.NODE_ENV === 'test';

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  if (isTest || process.env.NODE_ENV === 'production' || process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('[ENV] Missing AI API keys, using mock environment fallbacks.');
  }
}

export const env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || 'mock-groq-key',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'mock-gemini-key',
};
