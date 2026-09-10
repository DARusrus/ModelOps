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
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"hello":"world"}' } }],
        }),
      });

      const result = await generateGroqResponse('test', 'test-key');
      expect(result.provider).toBe('groq');
      expect(result.raw_text).toBe('{"hello":"world"}');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ model: 'openai/gpt-oss-20b', response_format: { type: 'json_object' } });
    });

    it('should retry on 503 error and succeed on second attempt', async () => {
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

      const promise = generateGroqResponse('test', 'test-key');

      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result.raw_text).toBe('{"retry":"success"}');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately on 401 Unauthorized (non-retryable)', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({}),
        text: async () => 'Unauthorized',
      });

      await expect(generateGroqResponse('test', 'test-key')).rejects.toMatchObject({
        status_code: 401,
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('stops retries immediately when the total request signal is cancelled', async () => {
      fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
      }));
      const deadline = new AbortController();

      const request = generateGroqResponse('test', 'test-key', deadline.signal);
      deadline.abort(new DOMException('Total deadline reached', 'TimeoutError'));

      await expect(request).rejects.toMatchObject({ status_code: 504, is_timeout: true });
      expect(fetchMock).toHaveBeenCalledOnce();
    });
  });

  describe('Gemini Provider', () => {

    it('should parse successful JSON response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"hello":"gemini"}' }] } }],
        }),
      });

      const result = await generateGeminiResponse('test', 'test-key');
      expect(result.provider).toBe('gemini');
      expect(result.raw_text).toBe('{"hello":"gemini"}');
      expect(fetchMock.mock.calls[0][0]).toContain('/gemini-3.6-flash:generateContent');
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ generationConfig: { responseFormat: { text: { mimeType: 'application/json' } } } });
    });

    it('should handle missing text payload gracefully', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [] } }], // missing text
        }),
      });

      await expect(generateGeminiResponse('test', 'test-key')).rejects.toMatchObject({
        provider: 'gemini',
        message: expect.stringContaining('empty text payload'),
      });
    });
  });
});
