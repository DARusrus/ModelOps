import { AIProviderResponse } from '@/types';
import { AIProviderErrorClass } from '../errors';
import { logger } from '../logger';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 1;
const RETRY_BASE_DELAY_MS = 1000;

/** Returns true for HTTP status codes that warrant a retry */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 503 || status >= 500;
}

export async function generateGroqResponse(
  prompt: string,
  apiKey: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<AIProviderResponse> {
  let lastError: AIProviderErrorClass | null = null;
  logger.info('[Groq] Loaded provider. Attempting generation...');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      logger.info(`[Groq] Retry attempt ${attempt} after ${delay}ms delay...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      logger.info(`[Groq] Sending request...`);
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a precise JSON-only generator for ML Model Cards.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latency_ms = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Unknown error';
        
        if (response.status === 401) {
          logger.error(`[Groq] Authentication error: Invalid API key.`);
        } else if (response.status === 429) {
          logger.warn(`[Groq] Rate limit exceeded.`);
        } else if (response.status === 403) {
          logger.error(`[Groq] Quota exceeded or forbidden.`);
        }
        
        lastError = new AIProviderErrorClass(
          'groq',
          `Groq API returned ${response.status}: ${errorMessage}`,
          response.status
        );

        // Retry on transient errors only
        if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
          logger.warn(`[Groq] Retryable error (${response.status}). Will retry.`);
          continue;
        }
        throw lastError;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        logger.error(`[Groq] Invalid response: empty payload.`);
        throw new AIProviderErrorClass('groq', 'Groq returned an empty response choices payload.');
      }

      logger.info(`[Groq] Provider success. Latency: ${latency_ms}ms.`);
      return {
        raw_text: content,
        provider: 'groq',
        latency_ms,
      };
    } catch (error: unknown) {
      clearTimeout(timer);
      const isTimeout = error instanceof Error && error.name === 'AbortError';
      
      if (isTimeout) {
        logger.error(`[Groq] Network timeout after ${timeoutMs}ms.`);
        lastError = new AIProviderErrorClass('groq', `Network timeout after ${timeoutMs}ms`);
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

      logger.error(`[Groq] Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      lastError = new AIProviderErrorClass(
        'groq',
        `Unexpected Groq Error: ${error instanceof Error ? error.message : String(error)}`
      );
      
      if (attempt < MAX_RETRIES) continue;
      throw lastError;
    }
  }

  throw lastError || new AIProviderErrorClass('groq', 'Groq generation failed after max retries.');
}
