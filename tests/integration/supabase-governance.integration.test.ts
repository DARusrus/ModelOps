import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import nodeFetch from 'node-fetch';
import { createAbortDeadline } from '../../src/lib/network/timeout';

const CONFIRMATION = 'RUN_ON_DISPOSABLE_TEST_PROJECT';
const enabled = process.env.RUN_SUPABASE_INTEGRATION === 'true';
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const READ_REQUEST_TIMEOUT_MS = 5_000;
const MUTATION_REQUEST_TIMEOUT_MS = 15_000;
const nodeFetchTransport = nodeFetch as unknown as typeof fetch;

/** The live integration runner uses node-fetch instead of Node 22's bundled
 * Undici transport. On Windows the latter can intermittently stall against
 * the Supabase gateway; this adapter remains test-only and request-bounded.
 * Internal read deadlines become retryable transport errors, while caller
 * cancellation stays an AbortError and mutations remain single-attempt. */
const integrationFetch: typeof fetch = async (input, init) => {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const isRead = method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
  const timeoutMs = isRead ? READ_REQUEST_TIMEOUT_MS : MUTATION_REQUEST_TIMEOUT_MS;
  const deadline = createAbortDeadline(timeoutMs, init?.signal);
  try {
    return await nodeFetchTransport(input, { ...init, signal: deadline.signal });
  } catch (error) {
    const requestUrl = typeof input === 'string' ? new URL(input) : input instanceof URL ? input : new URL(input.url);
    const transportError = error instanceof Error
      ? error as Error & { code?: unknown; cause?: { code?: unknown } }
      : undefined;
    console.warn('[integration] Supabase transport failed', {
      method,
      path: requestUrl.pathname,
      error_type: error instanceof Error ? error.name : 'UNKNOWN',
      cause_code: typeof transportError?.code === 'string'
        ? transportError.code
        : typeof transportError?.cause?.code === 'string' ? transportError.cause.code : undefined,
    });
    if (deadline.didTimeout()) {
      const timeoutError = new Error(`Supabase integration request timed out after ${timeoutMs}ms`);
      timeoutError.name = 'IntegrationTimeoutError';
      throw timeoutError;
    }
    throw error;
  } finally {
    deadline.dispose();
  }
};

function integrationClientOptions() {
  return {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    // Supabase retries GET/HEAD/OPTIONS only. POST-based RPC mutations remain
    // single-attempt and use explicit idempotency reconciliation where needed.
    db: { retry: true },
    global: { fetch: integrationFetch },
  } as const;
}

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

const TRANSIENT_RETRY_DELAYS_MS = [250, 1_000] as const;

function isTransientTransportFailure(error: { message: string } | null): boolean {
  return Boolean(error && /fetch failed|network error|timed?\s*out|aborted a request|ECONNRESET|ETIMEDOUT|UND_ERR_/i.test(error.message));
}

async function retryTransient<T extends { error: { message: string } | null }>(operation: string, request: () => PromiseLike<T>): Promise<T> {
  let result = await request();
  for (const delayMs of TRANSIENT_RETRY_DELAYS_MS) {
    if (!isTransientTransportFailure(result.error)) return result;
    console.warn(`[integration] ${operation} hit a transient transport failure; retrying in ${delayMs}ms.`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await request();
  }
  return result;
}

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

function requireSuccessfulCalls(
  results: Array<{ error: { code?: string; message: string; details?: string; hint?: string } | null }>,
  operation: string,
): void {
  const failures = results.flatMap((result, index) => result.error ? [{ request: index + 1, ...result.error }] : []);
  if (failures.length > 0) throw new Error(`${operation}: ${JSON.stringify(failures)}`);
}

describe.skipIf(!enabled)('Supabase governance integration', () => {
  let fixture: Fixture;

  beforeAll(async () => {
    const config = integrationConfig();
    const admin = createClient(config.url, config.serviceRoleKey, integrationClientOptions());
    const runId = crypto.randomUUID();
    const password = `ModelOps-${crypto.randomUUID()}-safe`;
    const createdUserA = await admin.auth.admin.createUser({ email: `modelops-a-${runId}@example.test`, password, email_confirm: true });
    const createdUserB = await admin.auth.admin.createUser({ email: `modelops-b-${runId}@example.test`, password, email_confirm: true });
    if (createdUserA.error || !createdUserA.data.user) throw new Error(`create user A: ${createdUserA.error?.message || 'no user returned'}`);
    if (createdUserB.error || !createdUserB.data.user) throw new Error(`create user B: ${createdUserB.error?.message || 'no user returned'}`);
    const userA = createdUserA.data.user;
    const userB = createdUserB.data.user;
    const organizationAId = crypto.randomUUID();
    const organizationBId = crypto.randomUUID();
    const organizationA = await requireData<{ id: string }>(await retryTransient('create organization A', () => admin.from('organizations').upsert({ id: organizationAId, name: `ModelOps integration A ${runId}` }, { onConflict: 'id' }).select('id').single()), 'create organization A');
    const organizationB = await requireData<{ id: string }>(await retryTransient('create organization B', () => admin.from('organizations').upsert({ id: organizationBId, name: `ModelOps integration B ${runId}` }, { onConflict: 'id' }).select('id').single()), 'create organization B');
    const membership = await retryTransient('create memberships', () => admin.from('memberships').upsert([
      { organization_id: organizationA.id, user_id: userA.id, role: 'admin' },
      { organization_id: organizationB.id, user_id: userB.id, role: 'viewer' },
    ], { onConflict: 'organization_id,user_id' }));
    if (membership.error) throw new Error(`create memberships: ${membership.error.message}`);

    const payload = { model_name: 'Integration model', version: '1.0.0', evidence_items: [] };
    const cardAId = crypto.randomUUID();
    const expiredCardAId = crypto.randomUUID();
    const cardA = await requireData<{ id: string }>(await retryTransient('create active card', () => admin.from('model_cards').upsert({ id: cardAId, organization_id: organizationA.id, created_by: userA.id, payload, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft' }, { onConflict: 'id' }).select('id').single()), 'create active card');
    const expiredCardA = await requireData<{ id: string }>(await retryTransient('create expired card', () => admin.from('model_cards').upsert({ id: expiredCardAId, organization_id: organizationA.id, created_by: userA.id, payload, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', expires_at: new Date(Date.now() - 60_000).toISOString() }, { onConflict: 'id' }).select('id').single()), 'create expired card');
    const paginationTime = Date.now() + 60_000;
    const paginationCardIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const paginationCards = await requireData<{ id: string }[]>(await retryTransient('create paginated cards', () => admin.from('model_cards').upsert([
      { id: paginationCardIds[0], organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page A', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime).toISOString() },
      { id: paginationCardIds[1], organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page B', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime).toISOString() },
      { id: paginationCardIds[2], organization_id: organizationA.id, created_by: userA.id, payload: { model_name: 'Page C', version: '1.0.0', evidence_items: [] }, readiness_score: 50, rubric_version: 'integration', workflow_state: 'draft', created_at: new Date(paginationTime - 1_000).toISOString() },
    ], { onConflict: 'id' }).select('id')), 'create paginated cards');
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
    const client = createClient(config.url, config.publishableKey, integrationClientOptions());
    const signedIn = await retryTransient('sign in integration user', () => client.auth.signInWithPassword({ email: user.email, password: user.password }));
    if (signedIn.error) throw new Error(`sign in integration user: ${signedIn.error.message}`);
    return client;
  }

  it('enforces organization RLS and hides expired records', async () => {
    const owner = await signedInClient(fixture.userA);
    const outsider = await signedInClient(fixture.userB);
    const ownerRead = await owner.from('model_cards').select('id').eq('id', fixture.cardAId).maybeSingle();
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data?.id).toBe(fixture.cardAId);
    const emptyChainIntegrity = await retryTransient('verify empty attestation chain', () => owner.rpc('verify_model_card_attestations', { target_card: fixture.cardAId }));
    expect(emptyChainIntegrity.error, JSON.stringify(emptyChainIntegrity.error)).toBeNull();
    expect(emptyChainIntegrity.data).toMatchObject({ valid: true, checked_events: 0 });
    const expiredRead = await owner.from('model_cards').select('id').eq('id', fixture.expiredCardAId).maybeSingle();
    expect(expiredRead.error).toBeNull();
    expect(expiredRead.data).toBeNull();
    const crossTenantRead = await outsider.from('model_cards').select('id').eq('id', fixture.cardAId).maybeSingle();
    expect(crossTenantRead.error).toBeNull();
    expect(crossTenantRead.data).toBeNull();
  });

  it('blocks the retired client-callable review RPC', async () => {
    const owner = await signedInClient(fixture.userA);
    const legacyReview = await owner.rpc('attest_model_card', {
      target_card: fixture.cardAId,
      requested_action: 'submitted',
      requested_reason: 'This direct client mutation must be rejected.',
    });
    expect(legacyReview.error).not.toBeNull();
    expect(legacyReview.data).toBeNull();

    const unchanged = await fixture.admin.from('model_cards').select('workflow_state').eq('id', fixture.cardAId).single();
    expect(unchanged.error).toBeNull();
    expect(unchanged.data?.workflow_state).toBe('draft');
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

  it('atomically persists one evaluation and replays it under concurrent idempotency claims', async () => {
    const key = crypto.randomUUID();
    const fingerprint = sha256(`integration-${crypto.randomUUID()}`);
    const operation = 'evaluation.create';
    const claimArgs = {
      target_org: fixture.organizationAId,
      requesting_actor: fixture.userA.id,
      target_operation: operation,
      target_key: key,
      fingerprint,
    };
    const claims = await Promise.all(Array.from({ length: 4 }, () => fixture.admin.rpc('claim_idempotency', claimArgs)));
    requireSuccessfulCalls(claims, 'concurrent idempotency claims');
    expect(claims.filter((claim) => claim.data?.action === 'claimed')).toHaveLength(1);
    expect(claims.filter((claim) => claim.data?.action === 'in_progress')).toHaveLength(3);

    const payload = {
      model_name: `Atomic integration ${key}`,
      version: '1.0.0',
      dataset: 'Atomic benchmark',
      intended_use: 'Atomic persistence validation',
      metrics: {},
      readiness_score: 25,
      decision: 'pending_human_review',
      evidence_items: [],
    };
    const persisted = await fixture.admin.rpc('persist_model_card_idempotently', {
      target_org: fixture.organizationAId,
      requesting_actor: fixture.userA.id,
      target_operation: operation,
      target_key: key,
      target_fingerprint: fingerprint,
      card_payload: payload,
      card_readiness_score: 25,
      card_rubric_version: 'integration',
    });

    // A timed-out mutation may have committed after its response was lost.
    // Reconcile through the same idempotency claim; never execute the write a
    // second time when its outcome is uncertain.
    let persistedBody = persisted.data;
    if (isTransientTransportFailure(persisted.error)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const reconciled = await retryTransient('reconcile timed-out model-card persistence', () => fixture.admin.rpc('claim_idempotency', claimArgs));
      expect(reconciled.error, JSON.stringify(reconciled.error)).toBeNull();
      expect(reconciled.data?.action).toBe('replay');
      persistedBody = reconciled.data?.response_body ?? null;
    } else {
      expect(persisted.error).toBeNull();
    }
    expect(persistedBody).toMatchObject({ model_name: payload.model_name, record_id: expect.any(String) });

    const replay = await fixture.admin.rpc('claim_idempotency', claimArgs);
    expect(replay.error).toBeNull();
    expect(replay.data).toMatchObject({ action: 'replay', response_status: 200, response_body: { record_id: persistedBody!.record_id } });
    const stored = await fixture.admin.from('model_cards').select('id').eq('id', persistedBody!.record_id);
    expect(stored.error).toBeNull();
    expect(stored.data).toHaveLength(1);
  });

  it('enforces the full server-owned rejection workflow and verifies its ordered chain', async () => {
    const attest = async (action: 'submitted' | 'under_review' | 'rejected', reason: string) => {
      const key = crypto.randomUUID();
      const fingerprint = sha256(`${action}-${crypto.randomUUID()}`);
      const operation = `review.${fixture.cardAId}`;
      const claim = await fixture.admin.rpc('claim_idempotency', {
        target_org: fixture.organizationAId, requesting_actor: fixture.userA.id,
        target_operation: operation, target_key: key, fingerprint,
      });
      expect(claim.error).toBeNull();
      expect(claim.data).toMatchObject({ action: 'claimed' });
      return fixture.admin.rpc('attest_model_card_idempotently', {
        target_org: fixture.organizationAId,
        requesting_actor: fixture.userA.id,
        target_card: fixture.cardAId,
        requested_action: action,
        requested_reason: reason,
        requested_policy_id: 'enterprise_general',
        target_operation: operation,
        target_key: key,
        target_fingerprint: fingerprint,
        response_policy: { integration: true },
      });
    };
    const submitted = await attest('submitted', 'integration submit');
    expect(submitted.error).toBeNull();
    expect(submitted.data).toMatchObject({ success: true, workflow_state: 'submitted', attestation: { sequence_no: 1 } });
    const underReview = await attest('under_review', 'integration review');
    expect(underReview.error).toBeNull();
    const rejected = await attest('rejected', 'integration rejection');
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
      .select('id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at')
      .eq('organization_id', fixture.organizationAId)
      .in('id', fixture.paginationCardIds)
      .eq('workflow_state', 'draft')
      .eq('created_by', fixture.userA.id)
      .gte('readiness_score', 0)
      .lte('readiness_score', 100)
      .or('model_name.ilike.*Page*,model_version.ilike.*Page*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(2);
    expect(firstPage.error).toBeNull();
    expect(firstPage.data).toHaveLength(2);
    expect(firstPage.data?.every((card) => card.model_name?.startsWith('Page ') && card.model_version === '1.0.0')).toBe(true);
    expect(Object.keys(firstPage.data![0]).sort()).toEqual(['created_at', 'created_by', 'expires_at', 'id', 'model_name', 'model_version', 'readiness_score', 'workflow_state']);

    const cursor = firstPage.data![1];
    const secondPage = await owner.from('model_cards')
      .select('id, model_name, model_version, readiness_score, workflow_state, created_by, created_at, expires_at')
      .eq('organization_id', fixture.organizationAId)
      .in('id', fixture.paginationCardIds)
      .eq('workflow_state', 'draft')
      .eq('created_by', fixture.userA.id)
      .gte('readiness_score', 0)
      .lte('readiness_score', 100)
      .gt('expires_at', new Date().toISOString())
      .or(`and(or(model_name.ilike.*Page*,model_version.ilike.*Page*),or(created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})))`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(2);
    expect(secondPage.error).toBeNull();
    expect(secondPage.data).toHaveLength(1);
    expect(secondPage.data?.[0].id).not.toBe(cursor.id);
    expect(secondPage.data?.[0].model_name).toBe('Page C');
  });

  it('returns exact bounded dashboard aggregates without exposing raw audit payloads', async () => {
    const owner = await signedInClient(fixture.userA);
    const direct = await owner.rpc('get_dashboard_snapshot_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      recent_limit: 5,
    });
    expect(direct.error?.code).toBe('42501');

    const activeRows = await fixture.admin.from('model_cards')
      .select('workflow_state')
      .eq('organization_id', fixture.organizationAId)
      .gt('expires_at', new Date().toISOString());
    expect(activeRows.error).toBeNull();
    const expectedCounts = {
      draft: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, changes_requested: 0,
    };
    for (const row of activeRows.data ?? []) expectedCounts[row.workflow_state as keyof typeof expectedCounts] += 1;

    const snapshot = await fixture.admin.rpc('get_dashboard_snapshot_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      recent_limit: 5,
    });
    expect(snapshot.error).toBeNull();
    expect(snapshot.data).toMatchObject({
      active_evaluations: activeRows.data?.length ?? 0,
      review_required: expectedCounts.submitted + expectedCounts.under_review,
      workflow_counts: expectedCounts,
    });
    expect(snapshot.data.recent_evaluations.length).toBeLessThanOrEqual(5);
    expect(snapshot.data.recent_activity.length).toBeLessThanOrEqual(5);
    const serializedActivity = JSON.stringify(snapshot.data.recent_activity);
    expect(serializedActivity).not.toContain('payload');
    expect(serializedActivity).not.toContain('reason');
    expect(serializedActivity).not.toContain('digest');
    expect(serializedActivity).not.toContain('evidence');

    const emptyOrganizationId = crypto.randomUUID();
    try {
      const emptyOrganization = await fixture.admin.from('organizations').insert({
        id: emptyOrganizationId,
        name: 'Empty dashboard integration organization',
        created_by: fixture.userA.id,
      });
      expect(emptyOrganization.error).toBeNull();
      const emptyMembership = await fixture.admin.from('memberships').insert({
        organization_id: emptyOrganizationId,
        user_id: fixture.userA.id,
        role: 'admin',
      });
      expect(emptyMembership.error).toBeNull();
      const emptySnapshot = await fixture.admin.rpc('get_dashboard_snapshot_as', {
        requesting_actor: fixture.userA.id,
        target_organization: emptyOrganizationId,
        recent_limit: 5,
      });
      expect(emptySnapshot.error).toBeNull();
      expect(emptySnapshot.data).toEqual({
        active_evaluations: 0,
        review_required: 0,
        workflow_counts: { draft: 0, submitted: 0, under_review: 0, approved: 0, rejected: 0, changes_requested: 0 },
        recent_evaluations: [],
        recent_activity: [],
      });
    } finally {
      await fixture.admin.from('organizations').delete().eq('id', emptyOrganizationId);
    }
  });

  it('enforces the reviewer queue boundary, author projection, and stable pagination', async () => {
    const owner = await signedInClient(fixture.userA);
    const cardIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
    const createdAt = Date.now() + 120_000;
    const queueCards = await fixture.admin.from('model_cards').insert(cardIds.map((id, index) => ({
      id,
      organization_id: fixture.organizationAId,
      created_by: fixture.userA.id,
      payload: { model_name: `Queue ${index + 1}`, version: '1.0.0', evidence_items: [] },
      readiness_score: 60 + index,
      rubric_version: 'integration',
      workflow_state: index === 2 ? 'draft' : index === 1 ? 'under_review' : 'submitted',
      created_at: new Date(createdAt - index * 1_000).toISOString(),
    })));
    expect(queueCards.error).toBeNull();

    try {
      const clientDenied = await owner.rpc('list_review_queue_as', {
        requesting_actor: fixture.userA.id,
        target_organization: fixture.organizationAId,
        requested_state: null,
        requested_limit: 21,
        cursor_created_at: null,
        cursor_id: null,
      });
      expect(clientDenied.error?.code).toBe('42501');

      const crossTenant = await fixture.admin.rpc('list_review_queue_as', {
        requesting_actor: fixture.userB.id,
        target_organization: fixture.organizationAId,
        requested_state: null,
        requested_limit: 21,
        cursor_created_at: null,
        cursor_id: null,
      });
      expect(crossTenant.error?.message).toBe('FORBIDDEN');

      const firstPage = await fixture.admin.rpc('list_review_queue_as', {
        requesting_actor: fixture.userA.id,
        target_organization: fixture.organizationAId,
        requested_state: null,
        requested_limit: 1,
        cursor_created_at: null,
        cursor_id: null,
      });
      expect(firstPage.error).toBeNull();
      expect(firstPage.data).toHaveLength(1);
      expect(firstPage.data?.[0]).toMatchObject({ id: cardIds[0], author_email: fixture.userA.email, workflow_state: 'submitted' });
      expect(firstPage.data?.[0]).not.toHaveProperty('payload');

      const secondPage = await fixture.admin.rpc('list_review_queue_as', {
        requesting_actor: fixture.userA.id,
        target_organization: fixture.organizationAId,
        requested_state: null,
        requested_limit: 2,
        cursor_created_at: firstPage.data![0].created_at,
        cursor_id: firstPage.data![0].id,
      });
      expect(secondPage.error).toBeNull();
      expect(secondPage.data?.[0]).toMatchObject({ id: cardIds[1], workflow_state: 'under_review' });
      expect(secondPage.data?.some((row: { id: string }) => row.id === cardIds[0])).toBe(false);
      expect(secondPage.data?.some((row: { id: string }) => row.id === cardIds[2])).toBe(false);

      const submittedOnly = await fixture.admin.rpc('list_review_queue_as', {
        requesting_actor: fixture.userA.id,
        target_organization: fixture.organizationAId,
        requested_state: 'submitted',
        requested_limit: 21,
        cursor_created_at: null,
        cursor_id: null,
      });
      expect(submittedOnly.error).toBeNull();
      expect(submittedOnly.data?.every((row: { workflow_state: string }) => row.workflow_state === 'submitted')).toBe(true);
    } finally {
      await fixture.admin.from('model_cards').delete().in('id', cardIds);
    }
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

  it('creates one confirmed-user workspace atomically without caller-controlled identity or role', async () => {
    const config = integrationConfig();
    const anonymous = createClient(config.url, config.publishableKey, integrationClientOptions());
    const unauthenticated = await anonymous.rpc('create_initial_workspace', { workspace_name: 'Unauthorized workspace' });
    expect(unauthenticated.error).not.toBeNull();

    const password = `ModelOps-onboarding-${crypto.randomUUID()}-safe`;
    const createdUser = await fixture.admin.auth.admin.createUser({
      email: `modelops-onboarding-${crypto.randomUUID()}@example.test`,
      password,
      email_confirm: true,
    });
    if (createdUser.error || !createdUser.data.user?.email) throw new Error(`create onboarding user: ${createdUser.error?.message || 'no user returned'}`);
    const user = createdUser.data.user;

    try {
      const client = await signedInClient({ email: user.email!, password });
      const attempts = await Promise.all(Array.from({ length: 4 }, () => client.rpc('create_initial_workspace', { workspace_name: 'Atomic Onboarding' })));
      requireSuccessfulCalls(attempts, 'concurrent initial-workspace creation');
      const rows = attempts.flatMap((attempt) => attempt.data ?? []);
      expect(new Set(rows.map((row) => row.organization_id)).size).toBe(1);
      expect(rows.filter((row) => row.created)).toHaveLength(1);
      expect(rows.every((row) => row.organization_role === 'admin')).toBe(true);

      const organizationId = rows[0].organization_id;
      const organizations = await fixture.admin.from('organizations').select('id, name').eq('created_by', user.id);
      expect(organizations.error).toBeNull();
      expect(organizations.data).toEqual([{ id: organizationId, name: 'Atomic Onboarding' }]);

      const membership = await fixture.admin.from('memberships').select('organization_id, user_id, role').eq('organization_id', organizationId).eq('user_id', user.id).single();
      expect(membership.error).toBeNull();
      expect(membership.data).toEqual({ organization_id: organizationId, user_id: user.id, role: 'admin' });

      const audit = await fixture.admin.from('audit_events').select('event_type, actor_id').eq('organization_id', organizationId).eq('event_type', 'organization_created');
      expect(audit.error).toBeNull();
      expect(audit.data).toEqual([{ event_type: 'organization_created', actor_id: user.id }]);

      const replay = await client.rpc('create_initial_workspace', { workspace_name: 'Must Not Rename Existing Workspace' });
      expect(replay.error).toBeNull();
      expect(replay.data).toEqual([{ organization_id: organizationId, organization_name: 'Atomic Onboarding', organization_role: 'admin', created: false }]);

      const callerControlled = await client.rpc('create_initial_workspace', {
        workspace_name: 'Rejected',
        requesting_actor: fixture.userA.id,
        requested_role: 'admin',
      } as never);
      expect(callerControlled.error).not.toBeNull();
    } finally {
      await fixture.admin.from('organizations').delete().eq('created_by', user.id);
      await fixture.admin.auth.admin.deleteUser(user.id);
    }
  });

  it('enforces invitation acceptance, role administration, tenant isolation, and final-admin safety', async () => {
    const owner = await signedInClient(fixture.userA);
    const invitedUser = await signedInClient(fixture.userB);

    const directCreate = await retryTransient('reject direct invitation creation', () => owner.rpc('create_organization_invitation_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_email: fixture.userB.email,
      requested_role: 'reviewer',
    }));
    expect(directCreate.error?.code).toBe('42501');

    const createArgs = {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_email: fixture.userB.email.toUpperCase(),
      requested_role: 'reviewer',
    };
    const concurrentCreates = await Promise.all([
      fixture.admin.rpc('create_organization_invitation_as', createArgs),
      fixture.admin.rpc('create_organization_invitation_as', createArgs),
    ]);
    requireSuccessfulCalls(concurrentCreates, 'concurrent invitation creation');
    const invitationIds = concurrentCreates.map((result) => result.data![0].invitation_id);
    expect(new Set(invitationIds).size).toBe(1);
    const invitationId = invitationIds[0];

    const outsiderRead = await invitedUser.from('organization_invitations').select('id').eq('id', invitationId).maybeSingle();
    expect(outsiderRead.error).toBeNull();
    expect(outsiderRead.data).toBeNull();

    const mismatchedAcceptance = await retryTransient('reject mismatched invitation acceptance', () => owner.rpc('accept_organization_invitation', { target_invitation: invitationId }));
    expect(mismatchedAcceptance.error?.message).toBe('INVITATION_EMAIL_MISMATCH');

    const accepted = await Promise.all([
      invitedUser.rpc('accept_organization_invitation', { target_invitation: invitationId }),
      invitedUser.rpc('accept_organization_invitation', { target_invitation: invitationId }),
    ]);
    requireSuccessfulCalls(accepted, 'concurrent invitation acceptance');
    expect(accepted.map((result) => result.data?.[0].organization_id)).toEqual([fixture.organizationAId, fixture.organizationAId]);
    expect(accepted.filter((result) => result.data?.[0].accepted)).toHaveLength(1);

    const membership = await fixture.admin.from('memberships').select('user_id, role').eq('organization_id', fixture.organizationAId).eq('user_id', fixture.userB.id);
    expect(membership.error).toBeNull();
    expect(membership.data).toEqual([{ user_id: fixture.userB.id, role: 'reviewer' }]);

    const listedMembers = await fixture.admin.rpc('list_organization_members_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
    });
    expect(listedMembers.error).toBeNull();
    expect(listedMembers.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ user_id: fixture.userA.id, email: fixture.userA.email, role: 'admin' }),
      expect.objectContaining({ user_id: fixture.userB.id, email: fixture.userB.email, role: 'reviewer' }),
    ]));

    const reviewerInvitationRead = await invitedUser.from('organization_invitations').select('id').eq('id', invitationId).maybeSingle();
    expect(reviewerInvitationRead.error).toBeNull();
    expect(reviewerInvitationRead.data).toBeNull();

    const nonAdminEscalation = await invitedUser.rpc('change_organization_member_role_as', {
      requesting_actor: fixture.userB.id,
      target_organization: fixture.organizationAId,
      target_user: fixture.userB.id,
      requested_role: 'admin',
    });
    expect(nonAdminEscalation.error).not.toBeNull();

    const changed = await fixture.admin.rpc('change_organization_member_role_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_user: fixture.userB.id,
      requested_role: 'editor',
    });
    expect(changed.error).toBeNull();
    expect(changed.data).toMatchObject({ role: 'editor' });

    const finalAdmin = await fixture.admin.rpc('change_organization_member_role_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_user: fixture.userA.id,
      requested_role: 'reviewer',
    });
    expect(finalAdmin.error?.message).toBe('FINAL_ADMIN_REQUIRED');

    const removed = await fixture.admin.rpc('remove_organization_member_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_user: fixture.userB.id,
    });
    expect(removed.error).toBeNull();
    const removedMembership = await fixture.admin.from('memberships').select('user_id').eq('organization_id', fixture.organizationAId).eq('user_id', fixture.userB.id).maybeSingle();
    expect(removedMembership.data).toBeNull();

    const revocable = await fixture.admin.rpc('create_organization_invitation_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_email: fixture.userB.email,
      requested_role: 'viewer',
    });
    expect(revocable.error).toBeNull();
    const revoked = await fixture.admin.rpc('revoke_organization_invitation_as', {
      requesting_actor: fixture.userA.id,
      target_invitation: revocable.data![0].invitation_id,
    });
    expect(revoked.error).toBeNull();
    const revokedAcceptance = await retryTransient('reject revoked invitation acceptance', () => invitedUser.rpc('accept_organization_invitation', { target_invitation: revocable.data![0].invitation_id }));
    expect(revokedAcceptance.error?.message).toBe('INVITATION_NOT_PENDING');

    const expiring = await fixture.admin.rpc('create_organization_invitation_as', {
      requesting_actor: fixture.userA.id,
      target_organization: fixture.organizationAId,
      target_email: fixture.userB.email,
      requested_role: 'viewer',
    });
    expect(expiring.error).toBeNull();
    const expiredAt = new Date(Date.now() - 60_000).toISOString();
    const forcedExpiry = await fixture.admin
      .from('organization_invitations')
      .update({ expires_at: expiredAt })
      .eq('id', expiring.data![0].invitation_id);
    expect(forcedExpiry.error).toBeNull();
    const expiredAcceptance = await retryTransient('reject expired invitation acceptance', () => invitedUser.rpc(
      'accept_organization_invitation',
      { target_invitation: expiring.data![0].invitation_id },
    ));
    expect(expiredAcceptance.error?.message).toBe('INVITATION_EXPIRED');

    const audit = await fixture.admin.from('audit_events')
      .select('event_type')
      .eq('organization_id', fixture.organizationAId)
      .in('event_type', ['organization_invitation_created', 'organization_invitation_accepted', 'organization_member_role_changed', 'organization_member_removed', 'organization_invitation_revoked']);
    expect(audit.error).toBeNull();
    expect(new Set(audit.data?.map((event) => event.event_type))).toEqual(new Set([
      'organization_invitation_created', 'organization_invitation_accepted', 'organization_member_role_changed', 'organization_member_removed', 'organization_invitation_revoked',
    ]));
  });
});
