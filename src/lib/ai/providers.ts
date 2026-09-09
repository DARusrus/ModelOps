import { AIProviderResponse, AIProviderErrorClass, PreferredProvider } from '@/types/modelops';
import { generateGroqResponse } from './groq';
import { generateGeminiResponse } from './gemini';
import { assertProviderAvailable, recordProviderFailure, recordProviderSuccess, type ProviderName } from './circuit-breaker';
import { withProviderConcurrencyLease } from './provider-concurrency';

export interface GenerateOptions {
  preferredProvider?: PreferredProvider;
}

async function callProvider(provider: ProviderName, prompt: string): Promise<AIProviderResponse> {
  await assertProviderAvailable(provider);
  return withProviderConcurrencyLease(provider, async () => {
    try {
      const result = provider === 'groq'
        ? await generateGroqResponse(prompt)
        : await generateGeminiResponse(prompt);
      await recordProviderSuccess(provider);
      return result;
    } catch (error) {
      if (!(error instanceof AIProviderErrorClass) || error.status_code === undefined || error.status_code === 429 || error.status_code >= 500) {
        await recordProviderFailure(provider);
      }
      throw error;
    }
  });
}

export async function generateWithFallback(
  prompt: string,
  options?: GenerateOptions
): Promise<AIProviderResponse> {
  const preferred = options?.preferredProvider || 'auto';

  // Provider secrets are server-owned. BYOK is intentionally not accepted at
  // this boundary until a separately approved vault-backed design exists.
  if (preferred === 'groq') {
    return callProvider('groq', prompt);
  }

  // 2. Explicit Gemini preference
  if (preferred === 'gemini') {
    return callProvider('gemini', prompt);
  }

  // 3. Explicit Offline Synthesizer preference
  if (preferred === 'offline') {
    throw new AIProviderErrorClass('offline', 'Offline synthesizer mode requested', 200);
  }

  // 4. Auto failover (Groq -> Gemini)
  try {
    return await callProvider('groq', prompt);
  } catch (groqError: unknown) {
    try {
      return await callProvider('gemini', prompt);
    } catch (geminiError: unknown) {
      void groqError;
      void geminiError;
      throw new AIProviderErrorClass('offline', 'No configured AI provider is available', 503);
    }
  }
}
