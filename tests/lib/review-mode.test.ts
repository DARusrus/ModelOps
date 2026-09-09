import { describe, expect, it } from 'vitest';
import { mayApproveCard } from '../../src/lib/governance/review-mode';

describe('review independence control', () => {
  it('allows a solo administrator to self-attest', () => {
    expect(mayApproveCard('self_attestation', 'author', 'author')).toBe(true);
  });

  it('rejects self-approval when independent review is selected', () => {
    expect(mayApproveCard('independent_review', 'author', 'author')).toBe(false);
  });

  it('allows a distinct reviewer under independent review', () => {
    expect(mayApproveCard('independent_review', 'author', 'reviewer')).toBe(true);
  });
});
