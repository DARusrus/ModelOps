import { describe, it, expect } from 'vitest';
import { readiness_score } from '../../src/lib/modelops/tools';

describe('readiness_score', () => {
  it('should calculate score correctly', () => {
    expect(readiness_score({})).toBe(85);
  });
});
