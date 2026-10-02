import { redirect } from 'next/navigation';
import AuthFrame from '@/components/auth/AuthFrame';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/supabase/verified-user';
import OnboardingForm from './OnboardingForm';

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) redirect('/login?next=%2Fonboarding');

  return (
    <AuthFrame title="Create your workspace" description="Set up the organization boundary that will own evaluations, evidence, members, and audit history.">
      <OnboardingForm />
    </AuthFrame>
  );
}
