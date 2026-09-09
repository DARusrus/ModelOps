import { describe, expect, it } from 'vitest';
import { workspaceAccessRedirect } from '../../src/lib/auth/workspace-access';

describe('workspace access redirects', () => {
  it('sends unauthenticated visitors to sign in', () => {
    expect(workspaceAccessRedirect(new Error('UNAUTHENTICATED'))).toBe('/login');
  });

  it('requires organization selection without an active valid membership', () => {
    expect(workspaceAccessRedirect(new Error('ORGANIZATION_SELECTION_REQUIRED'))).toBe('/select-organization');
  });

  it('does not disclose authorization details for other failures', () => {
    expect(workspaceAccessRedirect(new Error('FORBIDDEN'))).toBe('/forbidden');
    expect(workspaceAccessRedirect('unexpected')).toBe('/forbidden');
  });
});
