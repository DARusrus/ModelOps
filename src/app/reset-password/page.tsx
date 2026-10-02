import Link from 'next/link';
import { cookies } from 'next/headers';
import AuthFrame from '@/components/auth/AuthFrame';
import { PASSWORD_RECOVERY_COOKIE } from '@/lib/auth/continuation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/supabase/verified-user';
import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage() {
  const recoveryAuthorized = (await cookies()).get(PASSWORD_RECOVERY_COOKIE)?.value === '1';
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);

  if (!recoveryAuthorized || !user) {
    return (
      <AuthFrame title="Recovery link required" description="This page requires a valid, unexpired password-recovery session." footer={<Link href="/forgot-password" className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Request a new recovery link</Link>}>
        <p role="alert" className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Open the recovery link sent to your email. If it has expired or was already used, request another link.</p>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" description="The new password must satisfy the policy configured in Supabase Authentication.">
      <ResetPasswordForm />
    </AuthFrame>
  );
}
