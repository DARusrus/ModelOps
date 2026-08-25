import { AIProviderResponse, AIProviderErrorClass } from '@/types/modelops';
import { env } from '@/lib/env';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 300;

export async function generateGeminiResponse(
  prompt: string,
  customApiKey?: string
): Promise<AIProviderResponse> {
  const apiKey = customApiKey || env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AIProviderErrorClass('gemini', 'No Gemini API key configured', 401);
  }

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
            temperature: 0.1,
            maxOutputTokens: 1500,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        const providerErr = new AIProviderErrorClass(
          'gemini',
          `Gemini API failed with status ${status}: ${errorText}`,
          status
        );

        if (isRetryable && attempt < MAX_RETRIES) {
          attempt++;
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
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
        model_name: 'gemini-1.5-flash',
        raw_text: text,
      };
    } catch (err: unknown) {
      lastError = err;
      if (err instanceof AIProviderErrorClass) {
        throw err;
      }
      break;
    }
  }

  throw new AIProviderErrorClass(
    'gemini',
    lastError instanceof Error ? lastError.message : 'Unknown Gemini API failure',
    500
  );
}
