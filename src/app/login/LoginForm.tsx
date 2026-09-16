'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PasswordField from '@/components/auth/PasswordField';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

interface LoginFormProps {
  nextPath: string;
  initialMessage?: string;
}

export default function LoginForm({ nextPath, initialMessage = '' }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(initialMessage);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email, password });
      if (error) {
        setMessage('Sign-in failed. Check your email and password, then try again.');
        return;
      }
      router.replace(nextPath);
      router.refresh();
    } catch {
      setMessage('Sign-in is temporarily unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-gray-800">Email</label>
        <input id="email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="min-h-11 w-full rounded border border-gray-300 bg-white px-3 py-2 text-base text-gray-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20" />
      </div>
      <PasswordField id="password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">Forgot password?</Link>
      </div>
      <button type="submit" disabled={submitting} className="min-h-11 w-full cursor-pointer rounded bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60">
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
      {message && <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    </form>
  );
}
