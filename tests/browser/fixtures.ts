import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT';

export type BrowserFixture = {
  admin: SupabaseClient;
  organizationId: string;
  user: { id: string; email: string; password: string };
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
  const admin = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const runId = crypto.randomUUID();
  const password = `ModelOps-browser-${crypto.randomUUID()}-safe`;
  const created = await admin.auth.admin.createUser({ email: `modelops-browser-${runId}@example.test`, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`Create browser test user failed: ${created.error?.message || 'no user returned'}`);
  const organization = await admin.from('organizations').insert({ name: `ModelOps browser E2E ${runId}` }).select('id').single();
  if (organization.error || !organization.data) {
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create browser test organization failed: ${organization.error?.message || 'no organization returned'}`);
  }
  const membership = await admin.from('memberships').insert({ organization_id: organization.data.id, user_id: created.data.user.id, role: 'admin' });
  if (membership.error) {
    await admin.from('organizations').delete().eq('id', organization.data.id);
    await admin.auth.admin.deleteUser(created.data.user.id);
    throw new Error(`Create browser test membership failed: ${membership.error.message}`);
  }
  return { admin, organizationId: organization.data.id, user: { id: created.data.user.id, email: created.data.user.email!, password } };
}

export async function removeBrowserFixture(fixture: BrowserFixture | undefined) {
  if (!fixture) return;
  const organization = await fixture.admin.from('organizations').delete().eq('id', fixture.organizationId);
  const user = await fixture.admin.auth.admin.deleteUser(fixture.user.id);
  if (organization.error || user.error) {
    throw new Error(`Browser fixture cleanup failed: ${organization.error?.message || user.error?.message}`);
  }
}
