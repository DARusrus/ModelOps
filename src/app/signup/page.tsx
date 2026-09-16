import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthFrame from '@/components/auth/AuthFrame';
import { safeAuthContinuation } from '@/lib/auth/continuation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SignupForm from './SignupForm';

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const nextPath = safeAuthContinuation(next);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(nextPath);
  const loginHref = nextPath === '/modelops' ? '/login' : `/login?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthFrame title="Create an account" description="Confirm your email, then create or join an organization workspace." footer={<p>Already have an account? <Link href={loginHref} className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Sign in</Link></p>}>
      <SignupForm nextPath={nextPath} />
    </AuthFrame>
  );
}
