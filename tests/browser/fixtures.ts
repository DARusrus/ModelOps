import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import nodeFetch from 'node-fetch';
import { createAbortDeadline } from '../../src/lib/network/timeout';

const CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT';
const FIXTURE_REQUEST_TIMEOUT_MS = 15_000;
const CLEANUP_RETRY_DELAYS_MS = [250, 1_000] as const;
const nodeFetchTransport = nodeFetch as unknown as typeof fetch;

/** Keeps disposable fixture administration off Node 22's intermittently
 * stalling Undici path and gives every remote operation a hard deadline. */
const fixtureFetch: typeof fetch = async (input, init) => {
  const deadline = createAbortDeadline(FIXTURE_REQUEST_TIMEOUT_MS, init?.signal);
  try {
    return await nodeFetchTransport(input, { ...init, signal: deadline.signal });
  } catch (error) {
    if (deadline.didTimeout()) {
      const timeoutError = new Error(`Supabase browser fixture request timed out after ${FIXTURE_REQUEST_TIMEOUT_MS}ms`);
      timeoutError.name = 'BrowserFixtureTimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    deadline.dispose();
  }
};

function isTransientTransportFailure(error: { message: string } | null): boolean {
  return Boolean(error && /fetch failed|network error|timed?\s*out|aborted a request|ECONNRESET|ETIMEDOUT|UND_ERR_/i.test(error.message));
}

async function retryTransientCleanup<T extends { error: { message: string } | null }>(
  operation: string,
  request: () => PromiseLike<T>,
): Promise<T> {
  let result = await request();
  for (const delayMs of CLEANUP_RETRY_DELAYS_MS) {
    if (!isTransientTransportFailure(result.error)) return result;
    console.warn(`[browser fixture] ${operation} hit a transient transport failure; retrying in ${delayMs}ms.`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await request();
  }
  return result;
}

export type BrowserFixture = {
  admin: SupabaseClient;
  organizationId: string;
  user: { id: string; email: string; password: string };
  onboardingUser: { id: string; email: string; password: string };
  invitedUser: { id: string; email: string; password: string };
};

function config() {
  const url = process.env.SUPABASE_INTEGRATION_URL;
  const publishableKey = process.env.SUPABASE_INTEGRATION_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error('Browser E2E requires SUPABASE_INTEGRATION_URL, SUPABASE_INTEGRATION_PUBLISHABLE_KEY, and SUPABASE_INTEGRATION_SERVICE_ROLE_KEY.');
  }
  const authorizedTestMode =
    process.env.RUN_MODELOPS_BROWSER_E2E === 'true' || process.env.RUN_MODELOPS_PERFORMANCE === 'true';
  if (!authorizedTestMode || process.env.SUPABASE_INTEGRATION_CONFIRMATION !== CONFIRMATION) {
    throw new Error(
      `Refusing to create test data. Enable the browser E2E or performance runner and set SUPABASE_INTEGRATION_CONFIRMATION=${CONFIRMATION}.`,
    );
  }
  if (process.env.NEXT_PUBLIC_SUPABASE_URL !== url || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== publishableKey) {
    throw new Error('Browser E2E application configuration must match the explicitly acknowledged disposable Supabase project.');
  }
  return { url, serviceRoleKey };
}

export async function createBrowserFixture(): Promise<BrowserFixture> {
  const { url, serviceRoleKey } = config();
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { fetch: fixtureFetch },
  });
  const runId = crypto.randomUUID();
  const password = `ModelOps-browser-${crypto.randomUUID()}-safe`;
  const created = await admin.auth.admin.createUser({ email: `modelops-browser-${runId}@example.test`, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`Create browser test user failed: ${created.error?.message || 'no user returned'}`);
  const onboardingCreated = await admin.auth.admin.createUser({ email: `modelops-onboarding-${runId}@example.test`, password, email_confirm: true });
  if (onboardingCreated.error || !onboardingCreated.data.user) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create onboarding browser test user failed: ${onboardingCreated.error?.message || 'no user returned'}`);
  }
  const invitedCreated = await admin.auth.admin.createUser({ email: `modelops-invited-${runId}@example.test`, password, email_confirm: true });
  if (invitedCreated.error || !invitedCreated.data.user) {
    await admin.auth.admin.deleteUser(onboardingCreated.data.user.id);
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create invited browser test user failed: ${invitedCreated.error?.message || 'no user returned'}`);
  }
  const organization = await admin.from('organizations').insert({ name: `ModelOps browser E2E ${runId}` }).select('id').single();
  if (organization.error || !organization.data) {
    await admin.auth.admin.deleteUser(onboardingCreated.data.user.id);
    await admin.auth.admin.deleteUser(invitedCreated.data.user.id);
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create browser test organization failed: ${organization.error?.message || 'no organization returned'}`);
  }
  const membership = await admin.from('memberships').insert({ organization_id: organization.data.id, user_id: created.data.user.id, role: 'admin' });
  if (membership.error) {
    await admin.from('organizations').delete().eq('id', organization.data.id);
    await admin.auth.admin.deleteUser(onboardingCreated.data.user.id);
    await admin.auth.admin.deleteUser(invitedCreated.data.user.id);
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create browser test membership failed: ${membership.error.message}`);
  }
  return {
    admin,
    organizationId: organization.data.id,
    user: { id: created.data.user.id, email: created.data.user.email!, password },
    onboardingUser: { id: onboardingCreated.data.user.id, email: onboardingCreated.data.user.email!, password },
    invitedUser: { id: invitedCreated.data.user.id, email: invitedCreated.data.user.email!, password },
  };
}

export async function removeBrowserFixture(fixture: BrowserFixture | undefined) {
  if (!fixture) return;
  const onboardingOrganization = await retryTransientCleanup(
    'delete onboarding organization',
    () => fixture.admin.from('organizations').delete().eq('created_by', fixture.onboardingUser.id),
  );
  const organization = await retryTransientCleanup(
    'delete primary organization',
    () => fixture.admin.from('organizations').delete().eq('id', fixture.organizationId),
  );
  const onboardingUser = await retryTransientCleanup(
    'delete onboarding user',
    () => fixture.admin.auth.admin.deleteUser(fixture.onboardingUser.id),
  );
  const invitedUser = await retryTransientCleanup(
    'delete invited user',
    () => fixture.admin.auth.admin.deleteUser(fixture.invitedUser.id),
  );
  const user = await retryTransientCleanup(
    'delete primary user',
    () => fixture.admin.auth.admin.deleteUser(fixture.user.id),
  );
  if (onboardingOrganization.error || organization.error || onboardingUser.error || invitedUser.error || user.error) {
    throw new Error(`Browser fixture cleanup failed: ${onboardingOrganization.error?.message || organization.error?.message || onboardingUser.error?.message || invitedUser.error?.message || user.error?.message}`);
  }
}
