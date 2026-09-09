import { describe, expect, it } from 'vitest';
import { canPerform } from '../../src/lib/auth/permissions';

describe('role permission matrix', () => {
  it('never gives a viewer evaluation or review authority', () => {
    expect(canPerform('viewer', 'read')).toBe(true);
    expect(canPerform('viewer', 'evaluate')).toBe(false);
    expect(canPerform('viewer', 'review')).toBe(false);
  });
  it('keeps review authority restricted to reviewers and admins', () => {
    expect(canPerform('editor', 'review')).toBe(false);
    expect(canPerform('reviewer', 'review')).toBe(true);
    expect(canPerform('admin', 'review')).toBe(true);
  });
});
