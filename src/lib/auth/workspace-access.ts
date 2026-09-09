export function workspaceAccessRedirect(error: unknown): '/login' | '/select-organization' | '/forbidden' {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNAUTHENTICATED') return '/login';
  if (code === 'ORGANIZATION_SELECTION_REQUIRED') return '/select-organization';
  return '/forbidden';
}
