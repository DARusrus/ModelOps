'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isAbortError, requestJson } from '@/lib/client/api';

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
      router.replace('/modelops');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Organization could not be selected.');
      setSubmitting('');
    }
  };

  return <main className="min-h-screen grid place-items-center p-6 bg-gray-50"><section className="w-full max-w-lg rounded border border-gray-200 bg-white p-6 shadow-sm space-y-4"><div><p className="text-xs uppercase tracking-wider font-mono text-emerald-700">ModelOps workspace</p><h1 className="mt-1 text-xl font-bold">Choose an organization</h1><p className="mt-2 text-sm text-gray-600">Your active organization controls the data and permissions used in this session.</p></div>{error && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}<div className="space-y-2">{organizations.map((organization) => <button key={organization.organization_id} type="button" disabled={Boolean(submitting)} onClick={() => selectOrganization(organization.organization_id)} className="w-full cursor-pointer rounded border border-gray-300 p-4 text-left hover:border-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"><span className="block font-semibold">{organization.name}</span><span className="mt-1 block text-xs text-gray-500 capitalize">{organization.role}</span></button>)}</div>{!error && organizations.length === 0 && <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"><p>No organization membership is available for this account.</p><Link href="/onboarding" className="mt-3 inline-flex min-h-11 items-center rounded bg-emerald-800 px-4 font-semibold text-white hover:bg-emerald-900">Create your first workspace</Link></div>}</section></main>;
}
