import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().min(1, 'GROQ_API_KEY is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
});

// If we are in the test environment, fallback to dummy keys so imports don't fail
const isTest = process.env.NODE_ENV === 'test';

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  if (isTest) {
    console.warn('[ENV] Using dummy keys for tests.');
  } else {
    throw parsed.error;
  }
}

export const env = parsed.success ? parsed.data : {
  GROQ_API_KEY: 'test-groq-key',
  GEMINI_API_KEY: 'test-gemini-key',
};
