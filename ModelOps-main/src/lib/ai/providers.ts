import { generateGroqResponse } from './groq';
import { generateGeminiResponse } from './gemini';
import { AIProviderResponse } from '@/types';
import { AIProviderErrorClass } from '../errors';
import { logger } from '../logger';

export async function generateWithFallback(prompt: string): Promise<AIProviderResponse> {
  let groqError: AIProviderErrorClass | null = null;

  // Primary: Groq
  try {
    logger.info('[AI Provider] Attempting Primary Provider: Groq...');
    const result = await generateGroqResponse(prompt);
    logger.info(`[AI Provider] Groq succeeded in ${result.latency_ms}ms.`);
    return result;
  } catch (error) {
    groqError = error instanceof AIProviderErrorClass ? error : new AIProviderErrorClass('groq', String(error));
    logger.warn(`[AI Provider] Groq Primary Provider failed. Falling back to Gemini...`);
  }

  // Fallback: Gemini
  try {
    logger.info('[AI Provider] Attempting Fallback Provider: Gemini...');
    const result = await generateGeminiResponse(prompt);
    logger.info(`[AI Provider] Gemini succeeded in ${result.latency_ms}ms.`);
    return result;
  } catch (error) {
    logger.error(`[AI Provider] Gemini Fallback Provider failed.`);

    throw new AIProviderErrorClass(
      'gemini',
      `All AI Providers Failed due to upstream service errors.`
    );
  }
}
