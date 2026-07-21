import { describe, it, expect } from 'vitest';
import { compare_runs } from '../../src/lib/modelops/tools';

describe('compare_runs', () => {
  it('should compare two runs', () => {
    expect(compare_runs({}, {})).toEqual({});
  });
});
