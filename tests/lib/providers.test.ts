import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateWithFallback } from '../../src/lib/ai/providers';

// Mock both provider modules
vi.mock('../../src/lib/ai/groq', () => ({
  generateGroqResponse: vi.fn(),
}));

vi.mock('../../src/lib/ai/gemini', () => ({
  generateGeminiResponse: vi.fn(),
}));

import { generateGroqResponse } from '../../src/lib/ai/groq';
import { generateGeminiResponse } from '../../src/lib/ai/gemini';

const mockedGroq = vi.mocked(generateGroqResponse);
const mockedGemini = vi.mocked(generateGeminiResponse);

describe('generateWithFallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return Groq result when primary provider succeeds', async () => {
    mockedGroq.mockResolvedValue({
      raw_text: '{"model_name": "Test"}',
      provider: 'groq',
      latency_ms: 150,
    });

    const result = await generateWithFallback('test prompt');

    expect(result.provider).toBe('groq');
    expect(result.raw_text).toBe('{"model_name": "Test"}');
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('should fall back to Gemini when Groq fails', async () => {
    mockedGroq.mockRejectedValue({
      provider: 'groq',
      message: 'Groq API key missing',
    });
    mockedGemini.mockResolvedValue({
      raw_text: '{"model_name": "Fallback"}',
      provider: 'gemini',
      latency_ms: 300,
    });

    const result = await generateWithFallback('test prompt');

    expect(result.provider).toBe('gemini');
    expect(result.raw_text).toBe('{"model_name": "Fallback"}');
    expect(mockedGroq).toHaveBeenCalledOnce();
    expect(mockedGemini).toHaveBeenCalledOnce();
  });

  it('should throw when both providers fail', async () => {
    mockedGroq.mockRejectedValue({
      provider: 'groq',
      message: 'Groq error',
    });
    mockedGemini.mockRejectedValue({
      provider: 'gemini',
      message: 'Gemini error',
    });

    await expect(generateWithFallback('test prompt')).rejects.toThrow(
      /All AI Providers Failed/
    );
    expect(mockedGroq).toHaveBeenCalledOnce();
    expect(mockedGemini).toHaveBeenCalledOnce();
  });

  it('should pass the prompt to the primary provider', async () => {
    mockedGroq.mockResolvedValue({
      raw_text: '{}',
      provider: 'groq',
      latency_ms: 100,
    });

    await generateWithFallback('specific prompt text');

    expect(mockedGroq).toHaveBeenCalledWith('specific prompt text');
  });
});
