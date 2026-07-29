import { AIProviderResponse } from '@/types';
import { AIProviderErrorClass } from '../errors';
import { logger } from '../logger';

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
  apiKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<AIProviderResponse> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${apiKey}`;
  let lastError: AIProviderErrorClass | null = null;
  logger.info('[Gemini] Loaded provider. Attempting generation...');

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
      logger.info(`[Gemini] Sending request...`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: 'You are a precise JSON-only generator for ML Model Cards.\n\n' + prompt }],
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
        const errorMessage = errorData.error?.message || 'Unknown error';

        if (response.status === 401 || response.status === 403) {
          logger.error(`[Gemini] Authentication error or Quota exceeded (Status ${response.status}).`);
        } else if (response.status === 429) {
          logger.warn(`[Gemini] Rate limit exceeded.`);
        }

        lastError = new AIProviderErrorClass(
          'gemini',
          `Gemini API returned ${response.status}: ${errorMessage}`,
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
        logger.error(`[Gemini] Invalid response: empty payload.`);
        throw new AIProviderErrorClass('gemini', 'Gemini returned an empty text payload.');
      }

      logger.info(`[Gemini] Provider success. Latency: ${latency_ms}ms.`);
      return {
        raw_text: text,
        provider: 'gemini',
        latency_ms,
      };
    } catch (error: unknown) {
      clearTimeout(timer);
      const isTimeout = error instanceof Error && error.name === 'AbortError';

      if (isTimeout) {
        logger.error(`[Gemini] Network timeout after ${timeoutMs}ms.`);
        lastError = new AIProviderErrorClass('gemini', `Network timeout after ${timeoutMs}ms`);
        if (attempt < MAX_RETRIES) continue;
        throw lastError;
      }

      if (error instanceof AIProviderErrorClass) {
        if (error.status_code && isRetryableStatus(error.status_code) && attempt < MAX_RETRIES) {
          lastError = error;
          continue;
        }
        throw error;
      }
      
      logger.error(`[Gemini] Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      lastError = new AIProviderErrorClass(
        'gemini',
        `Unexpected Gemini Error: ${error instanceof Error ? error.message : String(error)}`
      );

      if (attempt < MAX_RETRIES) continue;
      throw lastError;
    }
  }

  throw lastError || new AIProviderErrorClass('gemini', 'Gemini generation failed after max retries.');
}
