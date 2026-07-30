import { AIProviderResponse } from '@/types';
import { AIProviderErrorClass } from '../errors';
import { logger } from '../logger';
import { env } from '../env';

const DEFAULT_GEMINI_MODEL = 'gemini-1.5-flash';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 1000;

/** Returns true for HTTP status codes that warrant a retry */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

export async function generateGeminiResponse(
  prompt: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<AIProviderResponse> {
  const apiKey = env.GEMINI_API_KEY;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent`;
  let lastError: AIProviderErrorClass | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info(`[Gemini] Retry attempt ${attempt} after ${delay}ms delay...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latency_ms = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new AIProviderErrorClass(
          'gemini',
          `Gemini API returned ${response.status}: ${errorData.error?.message || 'Unknown error'}`,
          response.status
        );

        // Retry on transient errors only
        if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
          logger.warn(`[Gemini] Retryable error (${response.status}). Will retry.`);
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new AIProviderErrorClass('gemini', 'Gemini returned an empty text payload.');
      }

      return {
        raw_text: text,
        provider: 'gemini',
        latency_ms,
      };
    } catch (error: unknown) {
      clearTimeout(timer);
      if (error instanceof AIProviderErrorClass) {
        if (error.status_code && isRetryableStatus(error.status_code) && attempt < MAX_RETRIES) {
          lastError = error;
          continue;
        }
        throw error;
      }
      
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      lastError = new AIProviderErrorClass(
        'gemini',
        isTimeout ? `Gemini request timed out after ${timeoutMs}ms` : (error instanceof Error ? error.message : 'Unknown Gemini error occurred'),
        undefined,
        isTimeout
      );
      throw lastError;
    }
  }

  // Fallthrough: all retries exhausted
  throw lastError || new AIProviderErrorClass('gemini', 'Gemini request failed after all retries.');
}
