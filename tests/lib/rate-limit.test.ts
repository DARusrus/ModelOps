import { describe, it, expect, beforeEach } from 'vitest';
import { isRateLimited } from '../../src/lib/rate-limit';

describe('isRateLimited', () => {
  beforeEach(() => {
    // We cannot easily mock the internal Map across imports in Vitest without complex setup,
    // so we use dynamic IP identifiers for tests to ensure isolated state.
  });

  it('should allow requests within the limit', () => {
    const ip = `192.168.1.${Math.random()}`;
    // Limit is 2 by default in this test
    const opts = { windowMs: 1000, maxRequests: 2 };
    
    expect(isRateLimited(ip, opts)).toBe(false); // 1st
    expect(isRateLimited(ip, opts)).toBe(false); // 2nd
  });

  it('should block requests exceeding the limit', () => {
    const ip = `192.168.1.${Math.random()}`;
    const opts = { windowMs: 1000, maxRequests: 2 };
    
    expect(isRateLimited(ip, opts)).toBe(false); // 1st
    expect(isRateLimited(ip, opts)).toBe(false); // 2nd
    expect(isRateLimited(ip, opts)).toBe(true);  // 3rd - blocked
  });

  it('should reset the limit after the window expires', async () => {
    const ip = `192.168.1.${Math.random()}`;
    const opts = { windowMs: 100, maxRequests: 1 };
    
    expect(isRateLimited(ip, opts)).toBe(false); // 1st
    expect(isRateLimited(ip, opts)).toBe(true);  // 2nd - blocked

    // Wait for the window to pass
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(isRateLimited(ip, opts)).toBe(false); // 3rd - allowed again
  });
});
