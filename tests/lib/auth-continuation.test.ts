import { describe, expect, it } from 'vitest';
import { safeAuthContinuation } from '../../src/lib/auth/continuation';

describe('auth continuation allowlist', () => {
  it('preserves known internal destinations and their filters', () => {
    expect(safeAuthContinuation('/modelops')).toBe('/modelops');
    expect(safeAuthContinuation('/evaluations/card-1?tab=review')).toBe('/evaluations/card-1?tab=review');
    expect(safeAuthContinuation('/settings/account')).toBe('/settings/account');
  });

  it('rejects external, protocol-relative, encoded, fragmented, and unknown destinations', () => {
    for (const value of ['https://attacker.test', '//attacker.test', '/%2f%2fattacker.test', '/modelops#token', '/unknown', '\\\\attacker.test']) {
      expect(safeAuthContinuation(value)).toBe('/dashboard');
    }
  });
});
