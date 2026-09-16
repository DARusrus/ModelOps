import { safeAuthContinuation } from '@/lib/auth/continuation';

export function workspaceAccessRedirect(error: unknown, requestedPath?: string): string {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNAUTHENTICATED') {
    const nextPath = safeAuthContinuation(requestedPath, '');
    return nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login';
  }
  if (code === 'ORGANIZATION_SELECTION_REQUIRED') return '/select-organization';
  return '/forbidden';
}
