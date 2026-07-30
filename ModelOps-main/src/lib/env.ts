import { z } from 'zod';

const envSchema = z.object({
  GROQ_API_KEY: z.string().optional().default('mock-groq-key'),
  GEMINI_API_KEY: z.string().optional().default('mock-gemini-key'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('[ENV] Warning: Environment variables validation fallback used.');
}

export const env = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || 'mock-groq-key',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'mock-gemini-key',
};
