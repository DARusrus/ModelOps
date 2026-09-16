'use client';

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const genericSuccess = 'If an eligible account exists for that address, a password-reset link has been sent.';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', '/reset-password');
      await createSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo: callback.toString() });
      setMessage(genericSuccess);
    } catch {
      setMessage('The request could not be completed right now. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="recovery-email" className="mb-1.5 block text-sm font-semibold text-gray-800">Email</label>
        <input id="recovery-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="min-h-11 w-full rounded border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" />
      </div>
      <button type="submit" disabled={submitting} className="min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Requesting link…' : 'Send reset link'}</button>
      {message && <p role="status" className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950">{message}</p>}
    </form>
  );
}
