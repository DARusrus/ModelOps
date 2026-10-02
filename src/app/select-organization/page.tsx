'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAbortError, requestJson } from '@/lib/client/api';
import SignOutButton from '@/components/auth/SignOutButton';

type Organization = { organization_id: string; role: string; name: string };

export default function SelectOrganizationPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    requestJson<{ organizations?: Organization[] }>('/api/organization/active', { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        setOrganizations(body.organizations || []);
      })
      .catch((cause) => { if (!isAbortError(cause)) setError(cause instanceof Error ? cause.message : 'Organizations could not be loaded.'); });
    return () => controller.abort();
  }, []);

  const selectOrganization = async (organizationId: string) => {
    setSubmitting(organizationId); setError('');
    try {
      await requestJson('/api/organization/active', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organization_id: organizationId }) });
      router.replace('/dashboard');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Organization could not be selected.');
      setSubmitting('');
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-lg space-y-4 border border-slate-300 bg-white p-6 shadow-sm">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">ModelOps workspace</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Choose an organization</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Your active organization controls the records, permissions, and governance context used in this session.</p>
        </div>
        {error && <p role="alert" className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
        <div className="space-y-2">
          {organizations.map((organization) => (
            <button
              key={organization.organization_id}
              type="button"
              disabled={Boolean(submitting)}
              onClick={() => void selectOrganization(organization.organization_id)}
              className="min-h-16 w-full cursor-pointer border border-slate-300 p-4 text-left hover:border-emerald-700 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="block font-semibold text-slate-950">{organization.name}</span>
              <span className="mt-1 block text-xs capitalize text-slate-500">{submitting === organization.organization_id ? 'Activating…' : `${organization.role} access`}</span>
            </button>
          ))}
        </div>
        {!error && organizations.length === 0 && (
          <div className="border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>No organization membership is available for this account.</p>
            <Link href="/onboarding" className="mt-3 inline-flex min-h-11 items-center rounded bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">Create your first workspace</Link>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <Link href="/modelops#faq" className="text-sm font-semibold text-emerald-800 hover:underline">Help</Link>
          <SignOutButton className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2" />
        </div>
      </section>
    </main>
  );
}
