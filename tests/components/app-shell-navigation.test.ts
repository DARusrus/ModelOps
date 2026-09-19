import { describe, expect, it } from 'vitest';
import { isNavigationItemActive, navigationItemsForRole } from '../../src/components/app-shell/navigation';

describe('workspace navigation contract', () => {
  it('exposes only live routes and limits member administration to administrators', () => {
    expect(navigationItemsForRole('viewer').map((item) => item.href)).toEqual(['/modelops']);
    expect(navigationItemsForRole('editor').map((item) => item.href)).toEqual(['/modelops']);
    expect(navigationItemsForRole('reviewer').map((item) => item.href)).toEqual(['/modelops']);
    expect(navigationItemsForRole('admin').map((item) => item.href)).toEqual(['/modelops', '/settings/members']);
  });

  it('marks exact and nested destinations without matching sibling paths', () => {
    expect(isNavigationItemActive('/modelops', '/modelops')).toBe(true);
    expect(isNavigationItemActive('/settings/members/member-1', '/settings/members')).toBe(true);
    expect(isNavigationItemActive('/settings/organization', '/settings/members')).toBe(false);
    expect(isNavigationItemActive('/modelops-legacy', '/modelops')).toBe(false);
  });
});
