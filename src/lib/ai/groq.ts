import { AIProviderResponse, AIProviderErrorClass } from '@/types/modelops';
import { env } from '@/lib/env';
import { abortableDelay, createAbortDeadline, type AbortDeadline } from '@/lib/network/timeout';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 300;
const MAX_ERROR_BODY_LENGTH = 512;

async function waitBeforeRetry(delayMs: number, signal?: AbortSignal): Promise<void> {
  try {
    await abortableDelay(delayMs, signal);
  } catch {
    throw new AIProviderErrorClass('groq', 'Groq request deadline exceeded', 504, true);
  }
}

export async function generateGroqResponse(
  prompt: string,
  customApiKey?: string,
  signal?: AbortSignal
): Promise<AIProviderResponse> {
  const apiKey = customApiKey || env.GROQ_API_KEY;

  if (!apiKey) {
    throw new AIProviderErrorClass('groq', 'No Groq API key configured', 401);
  }

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_RETRIES) {
    let attemptDeadline: AbortDeadline | undefined;
    try {
      if (signal?.aborted) throw signal.reason ?? new DOMException('Operation aborted', 'AbortError');
      attemptDeadline = createAbortDeadline(env.AI_PROVIDER_TIMEOUT_MS, signal);
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert AI Governance and Model Card engineer adhering to NIST AI RMF and Google/Microsoft model reporting standards. Always return valid, clean JSON with no surrounding markdown formatting or backticks.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
        }),
        signal: attemptDeadline.signal,
      }).finally(() => attemptDeadline?.dispose());

      if (!response.ok) {
        const errorText = (await response.text().catch(() => '')).slice(0, MAX_ERROR_BODY_LENGTH);
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        const providerErr = new AIProviderErrorClass(
          'groq',
          `Groq API failed with status ${status}${errorText ? '. Provider response omitted from client logs.' : ''}`,
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
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIProviderErrorClass('groq', 'Received empty content payload from Groq API', 500);
      }

      return {
        provider: 'groq',
        model_name: env.GROQ_MODEL,
        raw_text: content,
      };
    } catch (err: unknown) {
      lastError = err;
      attemptDeadline?.dispose();
      const timedOut = attemptDeadline?.didTimeout() === true;
      if (signal?.aborted) {
        throw new AIProviderErrorClass('groq', 'Groq request deadline exceeded', 504, true);
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
        throw new AIProviderErrorClass('groq', 'Groq request timed out', 504, true);
      }
      break;
    }
  }

  throw new AIProviderErrorClass(
    'groq',
    'Groq request failed',
    500
  );
}
