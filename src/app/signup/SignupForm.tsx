'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordField from '@/components/auth/PasswordField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignupForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
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
      const callback = new URL('/auth/callback', window.location.origin);
      callback.searchParams.set('next', nextPath === '/modelops' ? '/onboarding' : nextPath);
      const { data, error } = await createSupabaseBrowserClient().auth.signUp({
        email,
        password,
        options: { emailRedirectTo: callback.toString() },
      });
      if (error) {
        setMessage('Account creation could not be completed. Check the configured password requirements and try again.');
        return;
      }
      if (data.session) {
        router.replace(nextPath === '/modelops' ? '/onboarding' : nextPath);
        router.refresh();
        return;
      }
      router.push('/signup/check-email');
    } catch {
      setMessage('Account creation is temporarily unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="signup-email" className="mb-1.5 block text-sm font-semibold text-gray-800">Email</label>
        <input id="signup-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="min-h-11 w-full rounded border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" />
      </div>
      <PasswordField id="signup-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
      <PasswordField id="signup-password-confirmation" label="Confirm password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
      <p className="text-xs leading-5 text-gray-600">Use a password that satisfies the policy configured by your organization’s authentication service.</p>
      <button type="submit" disabled={submitting} className="min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}</button>
      {message && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    </form>
  );
}
