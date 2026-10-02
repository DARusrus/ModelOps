'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function signOut() {
    setSubmitting(true);
    setError('');
    const { error: signOutError } = await createSupabaseBrowserClient().auth.signOut();
    if (signOutError) {
      setError('Sign out could not be completed. Please try again.');
      setSubmitting(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  return (
    <div>
      <button type="button" onClick={signOut} disabled={submitting} className={className}>
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {submitting ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
