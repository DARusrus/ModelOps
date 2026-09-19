'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordField from '@/components/auth/PasswordField';
import { requestJson } from '@/lib/client/api';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const submitButtonClass = [
  'min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
  'disabled:cursor-not-allowed disabled:opacity-60',
].join(' ');

export default function InvitationAcceptance({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function accept(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (password && password !== confirmation) {
      setError('The password confirmation does not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (password) {
        const { error: passwordError } = await createSupabaseBrowserClient().auth.updateUser({ password });
        if (passwordError) {
          setError('The password could not be saved. Check the configured password requirements and try again.');
          return;
        }
      }
      await requestJson(`/api/organization/invitations/${invitationId}/accept`, { method: 'POST' });
      router.replace('/modelops');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be accepted.');
    } finally { setSubmitting(false); }
  }

  return (
    <form onSubmit={accept} className="space-y-5">
      <div className="border-l-4 border-emerald-700 bg-slate-100 p-4 text-sm leading-6 text-slate-700">
        Your signed-in email must match the invitation. Membership and its assigned role are created atomically when you accept.
      </div>
      <fieldset className="space-y-4">
        <legend className="text-sm font-bold text-slate-900">New account only</legend>
        <p className="text-xs leading-5 text-slate-600">If the invitation created your account, set a password now. Existing users can leave both fields empty.</p>
        <PasswordField
          id="invitation-password"
          label="New password (optional)"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required={false}
        />
        {password && (
          <PasswordField
            id="invitation-password-confirmation"
            label="Confirm new password"
            value={confirmation}
            onChange={setConfirmation}
            autoComplete="new-password"
          />
        )}
      </fieldset>
      {error && <p role="alert" className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className={submitButtonClass}
      >
        {submitting ? 'Accepting invitation…' : 'Accept organization invitation'}
      </button>
    </form>
  );
}
