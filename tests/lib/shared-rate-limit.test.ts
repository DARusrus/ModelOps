import { describe, expect, it, vi } from 'vitest';
import { consumeSharedRateLimit } from '../../src/lib/shared-rate-limit';

describe('shared rate limit boundary', () => {
  it('calls the database RPC with bounded route settings', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    await expect(consumeSharedRateLimit({ rpc }, 'evaluate', 10, 60)).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('consume_rate_limit', { p_route: 'evaluate', p_max_requests: 10, p_window_seconds: 60 });
  });
  it('fails closed when the shared control is unavailable', async () => {
    await expect(consumeSharedRateLimit({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'down' } }) }, 'evaluate', 10, 60)).rejects.toThrow('RATE_LIMIT_UNAVAILABLE');
  });
});
