'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordField from '@/components/auth/PasswordField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('');
    if (password !== confirmation) {
      setMessage('The password confirmation does not match.');
      return;
    }

    setSubmitting(true);
    try {
      const client = createSupabaseBrowserClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        setMessage('The password could not be updated. Check the configured password requirements or request a new recovery link.');
        return;
      }
      await client.auth.signOut({ scope: 'local' });
      router.replace('/login?status=password_updated');
      router.refresh();
    } catch {
      setMessage('Password recovery is temporarily unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordField id="new-password-confirmation" label="Confirm new password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      <button type="submit" disabled={submitting} className="min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Updating password…' : 'Update password'}</button>
      {message && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{message}</p>}
    </form>
  );
}
