'use client';
import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { createTimeoutFetch } from '@/lib/network/timeout';
export default function LoginPage() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [message, setMessage] = useState(''); const [submitting, setSubmitting] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setMessage('');
    try {
      const client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { global: { fetch: createTimeoutFetch(15_000) } });
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) return setMessage('Sign-in failed. Check your email and password, then try again.');
      window.location.assign('/modelops');
    } catch {
      setMessage('Sign-in is temporarily unavailable. Please try again.');
    } finally { setSubmitting(false); }
  }
  return <main className="min-h-screen grid place-items-center p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-4 border p-6 rounded"><h1 className="text-xl font-bold">ModelOps sign in</h1><div><label htmlFor="email" className="mb-1 block text-sm font-medium">Email</label><input id="email" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full border p-2"/></div><div><label htmlFor="password" className="mb-1 block text-sm font-medium">Password</label><input id="password" required type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full border p-2"/></div><button disabled={submitting} className="w-full bg-emerald-700 text-white p-2 rounded disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>{message && <p role="alert">{message}</p>}</form></main>;
}
