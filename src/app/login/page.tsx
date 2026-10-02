import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthFrame from '@/components/auth/AuthFrame';
import { safeAuthContinuation } from '@/lib/auth/continuation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/supabase/verified-user';
import LoginForm from './LoginForm';

const callbackMessages: Record<string, string> = {
  missing_callback_code: 'The sign-in link is incomplete. Request a new link and try again.',
  session_exchange_failed: 'The sign-in link is invalid or expired. Request a new link and try again.',
  password_updated: 'Your password was updated. Sign in with the new password.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; status?: string }> }) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (user) redirect(safeAuthContinuation(params.next));

  const message = callbackMessages[params.error ?? params.status ?? ''];
  const nextPath = safeAuthContinuation(params.next);
  const signupHref = nextPath === '/dashboard' ? '/signup' : `/signup?next=${encodeURIComponent(nextPath)}`;

  return (
    <AuthFrame title="Sign in" description="Access your organization’s governed model evaluations." footer={<p>New to ModelOps? <Link href={signupHref} className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Create an account</Link></p>}>
      <LoginForm nextPath={nextPath} initialMessage={message} />
    </AuthFrame>
  );
}
