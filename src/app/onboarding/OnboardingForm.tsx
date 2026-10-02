'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '@/lib/client/api';

export default function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      await requestJson('/api/organization/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_name: name }),
      });
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Workspace could not be created.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="workspace-name" className="mb-1.5 block text-sm font-semibold text-gray-800">Workspace name</label>
        <input id="workspace-name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="organization" className="min-h-11 w-full rounded border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" />
      </div>
      <p className="text-xs leading-5 text-gray-600">You will become this workspace’s administrator. Members and reviewers can be invited after setup.</p>
      <button type="submit" disabled={submitting} className="min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating workspace…' : 'Create workspace'}</button>
      {message && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{message}</p>}
    </form>
  );
}
