import { AIProviderResponse, AIProviderErrorClass } from '@/types/modelops';
import { env } from '@/lib/env';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.1-8b-instant';
const MAX_RETRIES = 2;
const BASE_RETRY_DELAY_MS = 300;

export async function generateGroqResponse(
  prompt: string,
  customApiKey?: string
): Promise<AIProviderResponse> {
  const apiKey = customApiKey || env.GROQ_API_KEY;

  if (!apiKey) {
    throw new AIProviderErrorClass('groq', 'No Groq API key configured', 401);
  }

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: MODEL_NAME,
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
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        const providerErr = new AIProviderErrorClass(
          'groq',
          `Groq API failed with status ${status}: ${errorText}`,
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
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new AIProviderErrorClass('groq', 'Received empty content payload from Groq API', 500);
      }

      return {
        provider: 'groq',
        model_name: MODEL_NAME,
        raw_text: content,
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
    'groq',
    lastError instanceof Error ? lastError.message : 'Unknown Groq API failure',
    500
  );
}
