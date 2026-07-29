import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { generateWithFallback } from '../../src/lib/ai/providers';
import { resetEnvCache } from '../../src/lib/env';

const originalEnv = process.env;

describe('AI Providers Integration and Fallback', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    resetEnvCache();
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
    vi.useFakeTimers();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetEnvCache();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should succeed with Groq if Groq key is valid and API responds', async () => {
    process.env.GROQ_API_KEY = 'valid-groq-key';
    process.env.GEMINI_API_KEY = 'valid-gemini-key';

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"status":"groq-success"}' } }],
      }),
    });

    const result = await generateWithFallback('test prompt');
    expect(result.provider).toBe('groq');
    expect(result.raw_text).toBe('{"status":"groq-success"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should fallback to Gemini if Groq returns 401 Unauthorized', async () => {
    process.env.GROQ_API_KEY = 'invalid-groq-key';
    process.env.GEMINI_API_KEY = 'valid-gemini-key';

    // Groq fails with 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } }),
    });

    // Gemini succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"status":"gemini-success"}' }] } }],
      }),
    });

    const result = await generateWithFallback('test prompt');
    expect(result.provider).toBe('gemini');
    expect(result.raw_text).toBe('{"status":"gemini-success"}');
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 Groq, 1 Gemini
  });

  it('should retry Groq on transient 503 error, then fallback to Gemini if it still fails', async () => {
    process.env.GROQ_API_KEY = 'valid-groq-key';
    process.env.GEMINI_API_KEY = 'valid-gemini-key';

    // Groq fails 503 twice
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    // Gemini succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '{"status":"gemini-success"}' }] } }],
      }),
    });

    const promise = generateWithFallback('test prompt');
    
    // Fast-forward timers for Groq retries
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.provider).toBe('gemini');
    expect(result.raw_text).toBe('{"status":"gemini-success"}');
    expect(fetchMock).toHaveBeenCalledTimes(3); // 2 Groq attempts, 1 Gemini attempt
  });

  it('should throw exception if ALL providers fail', async () => {
    process.env.GROQ_API_KEY = 'invalid';
    process.env.GEMINI_API_KEY = 'invalid';

    // Groq 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    // Gemini 401
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    });

    await expect(generateWithFallback('test prompt')).rejects.toThrow('AI providers unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

