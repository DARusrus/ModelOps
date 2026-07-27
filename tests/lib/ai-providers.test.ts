import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { generateGroqResponse } from '../../src/lib/ai/groq';
import { generateGeminiResponse } from '../../src/lib/ai/gemini';

const originalEnv = process.env;

describe('Individual AI Providers', () => {
  let fetchMock: MockInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Groq Provider', () => {

    it('should parse successful JSON response', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"hello":"world"}' } }],
        }),
      });

      const result = await generateGroqResponse('test');
      expect(result.provider).toBe('groq');
      expect(result.raw_text).toBe('{"hello":"world"}');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('should retry on 503 error and succeed on second attempt', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({}),
        text: async () => 'Service Unavailable',
      });
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"retry":"success"}' } }],
        }),
      });

      const promise = generateGroqResponse('test');

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.raw_text).toBe('{"retry":"success"}');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately on 401 Unauthorized (non-retryable)', async () => {
      process.env.GROQ_API_KEY = 'test-key';
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => 'Unauthorized',
      });

      await expect(generateGroqResponse('test')).rejects.toMatchObject({
        status_code: 401,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Gemini Provider', () => {

    it('should parse successful JSON response', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"hello":"gemini"}' }] } }],
        }),
      });

      const result = await generateGeminiResponse('test');
      expect(result.provider).toBe('gemini');
      expect(result.raw_text).toBe('{"hello":"gemini"}');
    });

    it('should handle missing text payload gracefully', async () => {
      process.env.GEMINI_API_KEY = 'test-key';
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [] } }], // missing text
        }),
      });

      await expect(generateGeminiResponse('test')).rejects.toMatchObject({
        provider: 'gemini',
        message: expect.stringContaining('empty text payload'),
      });
    });
  });
});
