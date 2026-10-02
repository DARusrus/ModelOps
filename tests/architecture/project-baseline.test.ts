import { readFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { MODEL_TEMPLATES } from '../../src/components/modelops/model-templates';

const root = process.cwd();

const pageRoutes = [
  ['/', 'src/app/page.tsx'],
  ['/login', 'src/app/login/page.tsx'],
  ['/signup', 'src/app/signup/page.tsx'],
  ['/signup/check-email', 'src/app/signup/check-email/page.tsx'],
  ['/forgot-password', 'src/app/forgot-password/page.tsx'],
  ['/reset-password', 'src/app/reset-password/page.tsx'],
  ['/invite/accept', 'src/app/invite/accept/page.tsx'],
  ['/modelops', 'src/app/(workspace)/modelops/page.tsx'],
  ['/dashboard', 'src/app/(workspace)/dashboard/page.tsx'],
  ['/evaluations', 'src/app/(workspace)/evaluations/page.tsx'],
  ['/evaluations/new', 'src/app/(workspace)/evaluations/new/page.tsx'],
  ['/evaluations/[id]', 'src/app/(workspace)/evaluations/[id]/page.tsx'],
  ['/compare', 'src/app/(workspace)/compare/page.tsx'],
  ['/reviews', 'src/app/(workspace)/reviews/page.tsx'],
  ['/onboarding', 'src/app/onboarding/page.tsx'],
  ['/select-organization', 'src/app/select-organization/page.tsx'],
  ['/forbidden', 'src/app/forbidden/page.tsx'],
  ['/settings/members', 'src/app/(workspace)/settings/members/page.tsx'],
] as const;

const apiRoutes = [
  ['/api/health', 'src/app/api/health/route.ts'],
  ['/api/dashboard', 'src/app/api/dashboard/route.ts'],
  ['/api/reviews', 'src/app/api/reviews/route.ts'],
  ['/api/modelops', 'src/app/api/modelops/route.ts'],
  ['/api/modelops/[id]', 'src/app/api/modelops/[id]/route.ts'],
  ['/api/modelops/[id]/export', 'src/app/api/modelops/[id]/export/route.ts'],
  ['/api/modelops/[id]/history', 'src/app/api/modelops/[id]/history/route.ts'],
  ['/api/modelops/[id]/review', 'src/app/api/modelops/[id]/review/route.ts'],
  ['/api/modelops/compare', 'src/app/api/modelops/compare/route.ts'],
  ['/api/organization/active', 'src/app/api/organization/active/route.ts'],
  ['/api/organization/governance', 'src/app/api/organization/governance/route.ts'],
  ['/api/organization/onboarding', 'src/app/api/organization/onboarding/route.ts'],
  ['/api/organization/invitations', 'src/app/api/organization/invitations/route.ts'],
  ['/api/organization/invitations/[id]', 'src/app/api/organization/invitations/[id]/route.ts'],
  ['/api/organization/invitations/[id]/accept', 'src/app/api/organization/invitations/[id]/accept/route.ts'],
  ['/api/organization/members', 'src/app/api/organization/members/route.ts'],
  ['/api/organization/members/[userId]', 'src/app/api/organization/members/[userId]/route.ts'],
] as const;

const unsupportedProductClaims = [
  'ISO/IEC 42001 Ready',
  'Zero PII Retention',
  'NIST AI RMF 1.0 Aligned',
  'EU AI Act Article 13 Compliant',
] as const;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory);
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry);
    return (await stat(absolute)).isDirectory() ? sourceFiles(absolute) : [absolute];
  }));
  return nested.flat().filter((file) => /\.(?:ts|tsx)$/.test(file));
}

describe('project baseline boundaries', () => {
  it('keeps saved-card payload editing outside the public API', () => {
    const route = readFileSync(path.join(root, 'src/app/api/modelops/[id]/route.ts'), 'utf8');
    expect(route).toMatch(/export const GET/);
    expect(route).not.toMatch(/export (?:const|async function|function) (?:PATCH|PUT|POST|DELETE)\b/);
  });
  it('records the compatibility page and API inventory', () => {
    for (const [, file] of [...pageRoutes, ...apiRoutes]) {
      expect(() => readFileSync(path.join(root, file), 'utf8'), file).not.toThrow();
    }
  });

  it('keeps unsupported certification and zero-retention claims out of user-facing source', async () => {
    const files = await sourceFiles(path.join(root, 'src', 'components'));
    const userFacingSource = files.map((file) => readFileSync(file, 'utf8')).join('\n');

    for (const claim of unsupportedProductClaims) {
      expect(userFacingSource, claim).not.toContain(claim);
    }
  });

  it('prevents client modules from importing the privileged Supabase admin client', async () => {
    const files = await sourceFiles(path.join(root, 'src'));
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      const isClientModule = /^\s*['\"]use client['\"];?/m.test(source);
      const importsAdminClient = /from\s+['\"](?:@\/lib\/supabase\/admin|[^'\"]*\/supabase\/admin)['\"]/.test(source);
      return isClientModule && importsAdminClient ? [path.relative(root, file)] : [];
    });

    expect(violations).toEqual([]);
  });

  it('centralizes server-side Supabase user verification', async () => {
    const files = await sourceFiles(path.join(root, 'src'));
    const verificationModule = path.normalize(
      path.join(root, 'src', 'lib', 'supabase', 'verified-user.ts'),
    );
    const violations = files.flatMap((file) => {
      const source = readFileSync(file, 'utf8');
      return path.normalize(file) !== verificationModule && /\.auth\.getUser\(\)/.test(source)
        ? [path.relative(root, file)]
        : [];
    });

    expect(violations).toEqual([]);
  });

  it('keeps every archetype free of fabricated model facts and evidence', () => {
    for (const template of MODEL_TEMPLATES) {
      expect(template.data, template.id).toEqual({
        model_name: '',
        version: '',
        dataset: '',
        intended_use: '',
        metrics: {},
        limitations: [],
        risks: [],
        tests: [],
        reproducibility: '',
      });
    }
  });

  it('uses opt-in execution for public functions and explicitly seals server-only RPCs', () => {
    const migration = readFileSync(
      path.join(root, 'supabase/migrations/202609160002_restrict_privileged_rpc_execution.sql'),
      'utf8',
    );
    expect(migration).toContain('alter default privileges for role postgres in schema public');
    expect(migration).toContain('revoke execute on functions from public, anon, authenticated');

    const serverOnlyFunctions = [
      'create_organization_invitation_as',
      'list_organization_members_as',
      'change_organization_member_role_as',
      'remove_organization_member_as',
      'claim_idempotency',
      'persist_model_card_idempotently',
      'attest_model_card_idempotently',
      'purge_expired_governance_records',
    ];
    for (const functionName of serverOnlyFunctions) {
      expect(migration).toMatch(
        new RegExp(`revoke execute on function public\\.${functionName}\\([^;]+ from anon, authenticated;`),
      );
    }
  });

  it('keeps invitation actor retention consistent with terminal-state constraints', () => {
    const migration = readFileSync(
      path.join(root, 'supabase/migrations/202609170002_preserve_invitation_actor_references.sql'),
      'utf8',
    );
    expect(migration).toContain('drop constraint organization_invitations_accepted_by_fkey');
    expect(migration).toMatch(/foreign key \(accepted_by\) references auth\.users\(id\) on delete restrict;/);
    expect(migration).not.toContain('on delete set null');
  });

  it('keeps member listing columns qualified and service-role only', () => {
    const migration = readFileSync(
      path.join(root, 'supabase/migrations/202609190001_fix_member_listing.sql'),
      'utf8',
    );
    expect(migration).toContain('requester_membership.organization_id = target_organization');
    expect(migration).toContain('requester_membership.user_id = requesting_actor');
    expect(migration).toContain('requester_membership.role = \'admin\'');
    expect(migration).toContain('member_membership.user_id');
    expect(migration).toMatch(/from public, anon, authenticated;/);
    expect(migration).toMatch(/to service_role;/);
  });

  it('keeps dashboard and review reads bounded, actor-checked, and service-role only', () => {
    const migration = readFileSync(
      path.join(root, 'supabase/migrations/202609210001_dashboard_review_queue.sql'),
      'utf8',
    );
    expect(migration).toContain('membership.user_id = requesting_actor');
    expect(migration).toContain("membership.role in ('reviewer', 'admin')");
    expect(migration).toContain('limit recent_limit');
    expect(migration).toContain('requested_limit not between 1 and 51');
    expect(migration).toContain("card.workflow_state in ('submitted', 'under_review')");
    expect(migration).toContain('on public.model_cards (organization_id, created_at desc, id desc)');
    expect(migration).toContain('on public.model_cards (organization_id, expires_at)');
    expect(migration).toMatch(/revoke execute on function public\.get_dashboard_snapshot_as[\s\S]+from public, anon, authenticated;/);
    expect(migration).toMatch(/revoke execute on function public\.list_review_queue_as[\s\S]+from public, anon, authenticated;/);
    expect(migration).toMatch(/grant execute on function public\.get_dashboard_snapshot_as[\s\S]+to service_role;/);
    expect(migration).toMatch(/grant execute on function public\.list_review_queue_as[\s\S]+to service_role;/);
  });
});
