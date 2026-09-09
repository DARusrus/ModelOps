import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT';
const enabled = process.env.RUN_SUPABASE_INTEGRATION === 'true';

type IntegrationConfig = {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
};

type Fixture = {
  admin: SupabaseClient;
  userA: { id: string; email: string; password: string };
  userB: { id: string; email: string; password: string };
  organizationAId: string;
  organizationBId: string;
  cardAId: string;
  expiredCardAId: string;
  paginationCardIds: string[];
};

function integrationConfig(): IntegrationConfig {
  const url = process.env.SUPABASE_INTEGRATION_URL;
  const publishableKey = process.env.SUPABASE_INTEGRATION_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_INTEGRATION_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error('SUPABASE_INTEGRATION_URL, SUPABASE_INTEGRATION_PUBLISHABLE_KEY, and SUPABASE_INTEGRATION_SERVICE_ROLE_KEY are required.');
  }
  if (process.env.SUPABASE_INTEGRATION_CONFIRMATION !== CONFIRMATION) {
    throw new Error(`Set SUPABASE_INTEGRATION_CONFIRMATION=${CONFIRMATION} to acknowledge that this suite creates and deletes fixture users and data.`);
  }
  if (url === process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Integration tests refuse to run against NEXT_PUBLIC_SUPABASE_URL. Use a separate disposable Supabase project.');
  }
  return { url, publishableKey, serviceRoleKey };
}

async function requireData<T>(result: { data: T | null; error: { message: string } | null }, operation: string): Promise<T> {
  if (result.error || result.data === null) throw new Error(`${operation}: ${result.error?.message || 'no data returned'}`);
  return result.data;
}

describe.skipIf(!enabled)('Supabase governance integration', () => {
  let fixture: Fixture;

  beforeAll(async () => {
    const config = integrationConfig();
    const admin = createClient(config.url, config.serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const runId = crypto.randomUUID();
    const password = `ModelOps-${crypto.randomUUID()}-safe`;
    const createdUserA = await admin.auth.admin.createUser({ email: `modelops-a-${runId}@example.test`, password, email_confirm: true });
    const createdUserB = await admin.auth.admin.createUser({ email: `modelops-b-${runId}@example.test`, password, email_confirm: true });
    if (createdUserA.error || !createdUserA.data.user) throw new Error(`create user A: ${createdUserA.error?.message || 'no user returned'}`);
    if (createdUserB.error || !createdUserB.data.user) throw new Error(`create user B: ${createdUserB.error?.message || 'no user returned'}`);
    const userA = createdUserA.data.user;
    const userB = createdUserB.data.user;
    const organizationA = await requireData<{ id: string }>(await admin.from('organizations').insert({ name: `ModelOps integration A ${runId}` }).select('id').single(), 'create organization A');
    const organizationB = await requireData<{ id: string }>(await admin.from('organizations').insert({ name: `ModelOps integration B ${runId}` }).select('id').single(), 'create organization B');
    const membership = await admin.from('memberships').insert([
      { organization_id: organizationA.id, user_id: userA.id, role: 'admin' },
      { organization_id: organizationB.id, user_id: userB.id, role: 'viewer' },
    ]);
    if (membership.error) throw new Error(`create memberships: ${membership.error.message}`);

    const payload = { model_name: 'Integration model', version: '1.0.0', evidence_items: [] };
    const cardA = await requireData<{ id: string }>(await admin.from('model_cards').insert({ organization_id: organizationA.id, created_by: userA.id, payload, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft' }).select('id').single(), 'create active card');
    const expiredCardA = await requireData<{ id: string }>(await admin.from('model_cards').insert({ organization_id: organizationA.id, created_by: userA.id, payload, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', expires_at: new Date(Date.now() - 60_000).toISOString() }).select('id').single(), 'create expired card');
    const paginationTime = Date.now() + 60_000;
    const paginationCards = await requireData<{ id: string }[]>(await admin.from('model_cards').insert([
      { organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page A', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime).toISOString() },
      { organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page B', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime).toISOString() },
      { organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page C', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime - 1_000).toISOString() },
    ]).select('id'), 'create paginated cards');
    fixture = {
      admin,
      userA: { id: userA.id, email: userA.email!, password },
      userB: { id: userB.id, email: userB.email!, password },
      organizationAId: organizationA.id,
      organizationBId: organizationB.id,
      cardAId: cardA.id,
      expiredCardAId: expiredCardA.id,
      paginationCardIds: paginationCards.map((card) => card.id),
    };
  });

  afterAll(async () => {
    if (!fixture) return;
    await fixture.admin.from('organizations').delete().in('id', [fixture.organizationAId, fixture.organizationBId]);
    await fixture.admin.auth.admin.deleteUser(fixture.userA.id);
    await fixture.admin.auth.admin.deleteUser(fixture.userB.id);
  });

  async function signedInClient(user: { email: string; password: string }) {
    const config = integrationConfig();
    const client = createClient(config.url, config.publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const signedIn = await client.auth.signInWithPassword({ email: user.email, password: user.password });
    if (signedIn.error) throw new Error(`sign in integration user: ${signedIn.error.message}`);
    return client;
  }

  it('enforces organization RLS and hides expired records', async () => {
    const owner = await signedInClient(fixture.userA);
    const outsider = await signedInClient(fixture.userB);
    const ownerRead = await owner.from('model_cards').select('id').eq('id', fixture.cardAId).maybeSingle();
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data?.id).toBe(fixture.cardAId);
    const emptyChainIntegrity = await owner.rpc('verify_model_card_attestations', { target_card: fixture.cardAId });
    expect(emptyChainIntegrity.error).toBeNull();
    expect(emptyChainIntegrity.data).toMatchObject({ valid: true, checked_events: 0 });
    const expiredRead = await owner.from('model_cards').select('id').eq('id', fixture.expiredCardAId).maybeSingle();
    expect(expiredRead.error).toBeNull();
    expect(expiredRead.data).toBeNull();
    const crossTenantRead = await outsider.from('model_cards').select('id').eq('id', fixture.cardAId).maybeSingle();
    expect(crossTenantRead.error).toBeNull();
    expect(crossTenantRead.data).toBeNull();
  });

  it('physically purges expired governance records through the trusted retention function', async () => {
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const expiredEvidence = await fixture.admin.from('evidence_items').insert({
      organization_id: fixture.organizationAId,
      model_card_id: fixture.cardAId,
      created_by: fixture.userA.id,
      kind: 'risk',
      payload: { fixture: true },
      expires_at: expiredAt,
    }).select('id').single();
    expect(expiredEvidence.error).toBeNull();

    const expiredAudit = await fixture.admin.from('audit_events').insert({
      organization_id: fixture.organizationAId,
      actor_id: fixture.userA.id,
      event_type: 'integration_expired_audit',
      payload: { fixture: true },
      expires_at: expiredAt,
    }).select('id').single();
    expect(expiredAudit.error).toBeNull();

    const expiredAttestation = await fixture.admin.from('review_attestations').insert({
      organization_id: fixture.organizationAId,
      model_card_id: fixture.cardAId,
      model_card_reference: fixture.cardAId,
      actor_id: fixture.userA.id,
      action: 'submitted',
      reason: 'Expired retention fixture',
      rubric_version: 'integration',
      policy_id: 'enterprise_general',
      evidence_snapshot: [],
      previous_digest: null,
      digest: crypto.randomUUID().replaceAll('-', '').padEnd(64, '0'),
      sequence_no: 999_999,
      digest_version: 'v2',
      expires_at: expiredAt,
    }).select('id').single();
    expect(expiredAttestation.error).toBeNull();

    const expiredIdempotency = await fixture.admin.from('idempotency_records').insert({
      organization_id: fixture.organizationAId,
      actor_id: fixture.userA.id,
      operation: `integration-retention-${crypto.randomUUID()}`,
      idempotency_key: crypto.randomUUID(),
      request_fingerprint: 'integration-retention-fixture',
      expires_at: expiredAt,
    }).select('operation').single();
    expect(expiredIdempotency.error).toBeNull();

    const purge = await fixture.admin.rpc('purge_expired_governance_records');
    expect(purge.error).toBeNull();
    expect(purge.data).toMatchObject({
      model_cards: expect.any(Number),
      evidence_items: expect.any(Number),
      audit_events: expect.any(Number),
      review_attestations: expect.any(Number),
      idempotency_records: expect.any(Number),
    });

    const removedCard = await fixture.admin.from('model_cards').select('id').eq('id', fixture.expiredCardAId).maybeSingle();
    const removedEvidence = await fixture.admin.from('evidence_items').select('id').eq('id', expiredEvidence.data!.id).maybeSingle();
    const removedAudit = await fixture.admin.from('audit_events').select('id').eq('id', expiredAudit.data!.id).maybeSingle();
    const removedAttestation = await fixture.admin.from('review_attestations').select('id').eq('id', expiredAttestation.data!.id).maybeSingle();
    const removedIdempotency = await fixture.admin.from('idempotency_records').select('operation').eq('organization_id', fixture.organizationAId).eq('operation', expiredIdempotency.data!.operation).maybeSingle();
    expect(removedCard.data).toBeNull();
    expect(removedEvidence.data).toBeNull();
    expect(removedAudit.data).toBeNull();
    expect(removedAttestation.data).toBeNull();
    expect(removedIdempotency.data).toBeNull();
  });

  it('enforces the full server-owned rejection workflow and verifies its ordered chain', async () => {
    const submitted = await fixture.admin.rpc('attest_model_card_as', { requesting_actor: fixture.userA.id, target_card: fixture.cardAId, requested_action: 'submitted', requested_reason: 'integration submit', requested_policy_id: 'enterprise_general' });
    expect(submitted.error).toBeNull();
    const underReview = await fixture.admin.rpc('attest_model_card_as', { requesting_actor: fixture.userA.id, target_card: fixture.cardAId, requested_action: 'under_review', requested_reason: 'integration review', requested_policy_id: 'enterprise_general' });
    expect(underReview.error).toBeNull();
    const rejected = await fixture.admin.rpc('attest_model_card_as', { requesting_actor: fixture.userA.id, target_card: fixture.cardAId, requested_action: 'rejected', requested_reason: 'integration rejection', requested_policy_id: 'enterprise_general' });
    expect(rejected.error).toBeNull();
    const owner = await signedInClient(fixture.userA);
    const integrity = await owner.rpc('verify_model_card_attestations', { target_card: fixture.cardAId });
    expect(integrity.error).toBeNull();
    expect(integrity.data).toMatchObject({ valid: true, checked_events: 3 });
    const history = await owner.from('review_attestations').select('action, sequence_no').eq('model_card_reference', fixture.cardAId).order('sequence_no');
    expect(history.error).toBeNull();
    expect(history.data).toEqual([
      { action: 'submitted', sequence_no: 1 },
      { action: 'under_review', sequence_no: 2 },
      { action: 'rejected', sequence_no: 3 },
    ]);
  });

  it('reads generated list projections with stable keyset pagination', async () => {
    const owner = await signedInClient(fixture.userA);
    const firstPage = await owner.from('model_cards')
      .select('id, model_name, model_version, readiness_score, created_at, expires_at')
      .eq('organization_id', fixture.organizationAId)
      .in('id', fixture.paginationCardIds)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(2);
    expect(firstPage.error).toBeNull();
    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.data?.every((card) => card.model_name?.startsWith('Page ') && card.model_version === '1.0.0')).toBe(true);

    const cursor = firstPage.data![1];
    const secondPage = await owner.from('model_cards')
      .select('id, model_name, model_version, readiness_score, created_at, expires_at')
      .eq('organization_id', fixture.organizationAId)
      .in('id', fixture.paginationCardIds)
      .gt('expires_at', new Date().toISOString())
      .or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(2);
    expect(secondPage.error).toBeNull();
    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.data?.[0].id).not.toBe(cursor.id);
    expect(secondPage.data?.[0].model_name).toBe('Page C');
  });

  it('shares provider circuit state through the database and recovers after success', async () => {
    const initiallyAvailable = await fixture.admin.rpc('provider_circuit_available', { target_provider: 'groq' });
    expect(initiallyAvailable.error).toBeNull();
    expect(initiallyAvailable.data).toBe(true);
    for (let failure = 0; failure < 3; failure += 1) {
      const recorded = await fixture.admin.rpc('record_provider_circuit_failure', {
        target_provider: 'groq',
        failure_threshold: 3,
        cooldown_seconds: 30,
      });
      expect(recorded.error).toBeNull();
    }
    const open = await fixture.admin.rpc('provider_circuit_available', { target_provider: 'groq' });
    expect(open.error).toBeNull();
    expect(open.data).toBe(false);
    const recovered = await fixture.admin.rpc('record_provider_circuit_success', { target_provider: 'groq' });
    expect(recovered.error).toBeNull();
    const availableAgain = await fixture.admin.rpc('provider_circuit_available', { target_provider: 'groq' });
    expect(availableAgain.error).toBeNull();
    expect(availableAgain.data).toBe(true);
  });

  it('enforces the shared provider concurrency bulkhead and releases capacity', async () => {
    const first = await fixture.admin.rpc('acquire_provider_concurrency_lease', { target_provider: 'groq', max_concurrent: 1, lease_seconds: 30 });
    expect(first.error).toBeNull();
    expect(first.data).toMatch(/^[0-9a-f-]{36}$/i);
    const blocked = await fixture.admin.rpc('acquire_provider_concurrency_lease', { target_provider: 'groq', max_concurrent: 1, lease_seconds: 30 });
    expect(blocked.error).toBeNull();
    expect(blocked.data).toBeNull();
    const released = await fixture.admin.rpc('release_provider_concurrency_lease', { target_lease: first.data });
    expect(released.error).toBeNull();
    const acquiredAgain = await fixture.admin.rpc('acquire_provider_concurrency_lease', { target_provider: 'groq', max_concurrent: 1, lease_seconds: 30 });
    expect(acquiredAgain.error).toBeNull();
    expect(acquiredAgain.data).toMatch(/^[0-9a-f-]{36}$/i);
    await fixture.admin.rpc('release_provider_concurrency_lease', { target_lease: acquiredAgain.data });
  });
});
