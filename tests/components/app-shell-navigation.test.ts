import { describe, expect, it } from 'vitest';
import { isNavigationItemActive, navigationItemsForRole } from '../../src/components/app-shell/navigation';

describe('workspace navigation contract', () => {
  it('exposes only live routes and limits member administration to administrators', () => {
    expect(navigationItemsForRole('viewer').map((item) => item.href)).toEqual(['/dashboard', '/evaluations']);
    expect(navigationItemsForRole('editor').map((item) => item.href)).toEqual(['/dashboard', '/evaluations', '/compare']);
    expect(navigationItemsForRole('reviewer').map((item) => item.href)).toEqual(['/dashboard', '/evaluations', '/reviews', '/compare']);
    expect(navigationItemsForRole('admin').map((item) => item.href)).toEqual(['/dashboard', '/evaluations', '/reviews', '/compare', '/settings/members']);
  });

  it('marks exact and nested destinations without matching sibling paths', () => {
    expect(isNavigationItemActive('/evaluations/record-1', '/evaluations')).toBe(true);
    expect(isNavigationItemActive('/settings/members/member-1', '/settings/members')).toBe(true);
    expect(isNavigationItemActive('/settings/organization', '/settings/members')).toBe(false);
    expect(isNavigationItemActive('/evaluation-archive', '/evaluations')).toBe(false);
  });
});
