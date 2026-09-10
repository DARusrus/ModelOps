import { AIProviderResponse, AIProviderErrorClass } from '@/types/modelops';
import { env } from '@/lib/env';
import { abortableDelay, createAbortDeadline, type AbortDeadline } from '@/lib/network/timeout';

const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 300;
const MAX_ERROR_BODY_LENGTH = 512;

async function waitBeforeRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  try {
    await abortableDelay(delayMs, signal);
  } catch {
    throw new AIProviderErrorClass('gemini', 'Gemini request deadline exceeded', 504, true);
  }
}

export async function generateGeminiResponse(
  prompt: string,
  customApiKey?: string,
  signal?: AbortSignal
): Promise<AIProviderResponse> {
  const apiKey = customApiKey || env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AIProviderErrorClass('gemini', 'No Gemini API key configured', 401);
  }

  let attempt = 0;
  while (attempt <= MAX_RETRIES) {
    let attemptDeadline: AbortDeadline | undefined;
    try {
      if (signal?.aborted) throw signal.reason ?? new DOMException('Operation aborted', 'AbortError');
      attemptDeadline = createAbortDeadline(env.AI_PROVIDER_TIMEOUT_MS, signal);
      const response = await fetch(`${GEMINI_API_BASE_URL}/${encodeURIComponent(env.GEMINI_MODEL)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${prompt}\n\nCRITICAL: Respond ONLY with valid, parseable JSON. Do not include markdown code block formatting or backticks.`,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1500,
            responseFormat: { text: { mimeType: 'application/json' } },
          },
        }),
        signal: attemptDeadline.signal,
      }).finally(() => attemptDeadline?.dispose());

      if (!response.ok) {
        const errorText = (await response.text().catch(() => '')).slice(0, MAX_ERROR_BODY_LENGTH);
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        const providerErr = new AIProviderErrorClass(
          'gemini',
          `Gemini API failed with status ${status}${errorText ? '. Provider response omitted from client logs.' : ''}`,
          status
        );

        if (isRetryable && attempt < MAX_RETRIES) {
          attempt++;
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 100);
          await waitBeforeRetry(delay, signal);
          continue;
        }

        throw providerErr;
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new AIProviderErrorClass('gemini', 'Received empty text payload from Gemini API response', 500);
      }

      return {
        provider: 'gemini',
        model_name: env.GEMINI_MODEL,
        raw_text: text,
      };
    } catch (err: unknown) {
      attemptDeadline?.dispose();
      const timedOut = attemptDeadline?.didTimeout() === true;
      if (signal?.aborted) {
        throw new AIProviderErrorClass('gemini', 'Gemini request deadline exceeded', 504, true);
      }
      if (err instanceof AIProviderErrorClass) {
        throw err;
      }
      if (attempt < MAX_RETRIES) {
        attempt++;
        await waitBeforeRetry(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), signal);
        continue;
      }
      if (timedOut || (err instanceof DOMException && ['AbortError', 'TimeoutError'].includes(err.name))) {
        throw new AIProviderErrorClass('gemini', 'Gemini request timed out', 504, true);
      }
      break;
    }
  }

  throw new AIProviderErrorClass(
    'gemini',
    'Gemini request failed',
    500
  );
}
