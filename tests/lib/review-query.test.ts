import { describe, expect, it } from 'vitest';
import { parseReviewQueueQuery } from '../../src/lib/reviews/query';

describe('review queue query', () => {
  it('provides bounded defaults and accepts documented filters', () => {
    expect(parseReviewQueueQuery(new URLSearchParams())).toEqual({ state: 'all', limit: 20 });
    expect(parseReviewQueueQuery(new URLSearchParams('state=under_review&limit=50&cursor=abc'))).toEqual({ state: 'under_review', limit: 50, cursor: 'abc' });
  });

  it('rejects unknown, repeated, and out-of-range fields', () => {
    for (const query of ['state=draft', 'limit=51', 'state=all&state=submitted', 'organization_id=unsafe']) {
      expect(() => parseReviewQueueQuery(new URLSearchParams(query))).toThrow();
    }
  });
});
