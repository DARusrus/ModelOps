import { describe, expect, it } from 'vitest';

type State = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'changes_requested';
type Role = 'viewer' | 'editor' | 'reviewer' | 'admin';
function allowed(state: State, action: Exclude<State, 'draft'>, role: Role) {
  if (action === 'submitted') return ['editor', 'reviewer', 'admin'].includes(role) && ['draft', 'changes_requested'].includes(state);
  if (!['reviewer', 'admin'].includes(role)) return false;
  if (action === 'under_review') return state === 'submitted';
  return ['approved', 'rejected', 'changes_requested'].includes(action) && state === 'under_review';
}

describe('review workflow authorization', () => {
  it('allows an admin to submit a draft and progress its review', () => {
    expect(allowed('draft', 'submitted', 'admin')).toBe(true);
    expect(allowed('submitted', 'under_review', 'admin')).toBe(true);
    expect(allowed('under_review', 'approved', 'admin')).toBe(true);
  });
  it('does not allow invalid transitions or viewers', () => {
    expect(allowed('draft', 'approved', 'admin')).toBe(false);
    expect(allowed('draft', 'submitted', 'viewer')).toBe(false);
  });
});
