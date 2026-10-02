const exactRoutes = new Set([
  '/modelops',
  '/dashboard',
  '/evaluations',
  '/reviews',
  '/compare',
  '/activity',
  '/select-organization',
  '/onboarding',
  '/reset-password',
  '/invite/accept',
]);

const routePrefixes = ['/evaluations/', '/settings/'];

/** Accepts only known in-application destinations. It is intentionally not a
 * generic same-origin redirect helper: auth flows use a narrow allowlist. */
export function safeAuthContinuation(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value || value.length > 500 || /[\\\u0000-\u001f]/.test(value) || /%(?:2f|3a|5c)/i.test(value)) return fallback;

  try {
    const parsed = new URL(value, 'https://modelops.invalid');
    if (parsed.origin !== 'https://modelops.invalid' || parsed.username || parsed.password || parsed.hash) return fallback;
    const allowed = exactRoutes.has(parsed.pathname) || routePrefixes.some((prefix) => parsed.pathname.startsWith(prefix));
    return allowed ? `${parsed.pathname}${parsed.search}` : fallback;
  } catch {
    return fallback;
  }
}

export const PASSWORD_RECOVERY_COOKIE = 'modelops-password-recovery';
