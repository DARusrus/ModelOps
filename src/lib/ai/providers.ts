import { generateGroqResponse } from './groq';
import { generateGeminiResponse } from './gemini';
import { AIProviderResponse } from '@/types';
import { AIProviderErrorClass } from '../errors';
import { logger } from '../logger';
import { getEnv } from '../env';

export async function generateWithFallback(prompt: string): Promise<AIProviderResponse> {
  const env = getEnv();

  if (!env.GROQ_API_KEY || env.GROQ_API_KEY.startsWith('test-')) {
    logger.warn('[AI]\nSkipping Groq Provider');
  } else {
    try {
      logger.info('[AI Provider] Attempting Primary Provider: Groq...');
      const result = await generateGroqResponse(prompt, env.GROQ_API_KEY);
      logger.info(`[AI Provider] Groq succeeded in ${result.latency_ms}ms.`);
      return result;
    } catch (error) {
      logger.warn(`[AI Provider] Groq Primary Provider failed. Falling back to Gemini...`);
    }
  }

  if (!env.GEMINI_API_KEY || env.GEMINI_API_KEY.startsWith('test-')) {
    logger.warn('[AI]\nSkipping Gemini Provider');
  } else {
    try {
      logger.info('[AI Provider] Attempting Fallback Provider: Gemini...');
      const result = await generateGeminiResponse(prompt, env.GEMINI_API_KEY);
      logger.info(`[AI Provider] Gemini succeeded in ${result.latency_ms}ms.`);
      return result;
    } catch (error) {
      logger.error(`[AI Provider] Gemini Fallback Provider failed.`);
    }
  }

  logger.warn('[Fallback]\nUsing deterministic Model Card generation.');
  throw new AIProviderErrorClass('fallback', 'AI providers unavailable. Deterministic fallback used.');
}
