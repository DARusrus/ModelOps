import { AIProviderResponse, AIProviderErrorClass, PreferredProvider } from '@/types/modelops';
import { generateGroqResponse } from './groq';
import { generateGeminiResponse } from './gemini';

export interface GenerateOptions {
  preferredProvider?: PreferredProvider;
  groqApiKey?: string;
  geminiApiKey?: string;
}

export async function generateWithFallback(
  prompt: string,
  options?: GenerateOptions
): Promise<AIProviderResponse> {
  const preferred = options?.preferredProvider || 'auto';

  // 1. Explicit Groq preference
  if (preferred === 'groq') {
    return options?.groqApiKey
      ? generateGroqResponse(prompt, options.groqApiKey)
      : generateGroqResponse(prompt);
  }

  // 2. Explicit Gemini preference
  if (preferred === 'gemini') {
    return options?.geminiApiKey
      ? generateGeminiResponse(prompt, options.geminiApiKey)
      : generateGeminiResponse(prompt);
  }

  // 3. Explicit Offline Synthesizer preference
  if (preferred === 'offline') {
    throw new AIProviderErrorClass('offline', 'Offline synthesizer mode requested', 200);
  }

  // 4. Auto failover (Groq -> Gemini)
  try {
    return options?.groqApiKey
      ? await generateGroqResponse(prompt, options.groqApiKey)
      : await generateGroqResponse(prompt);
  } catch (groqError: unknown) {
    try {
      return options?.geminiApiKey
        ? await generateGeminiResponse(prompt, options.geminiApiKey)
        : await generateGeminiResponse(prompt);
    } catch (geminiError: unknown) {
      throw new Error(
        `All AI Providers Failed: Groq (${
          groqError instanceof Error ? groqError.message : 'Unknown'
        }), Gemini (${
          geminiError instanceof Error ? geminiError.message : 'Unknown'
        })`
      );
    }
  }
}
