import Link from 'next/link';
import { redirect } from 'next/navigation';
import AuthFrame from '@/components/auth/AuthFrame';
import InvitationAcceptance from './InvitationAcceptance';
import { InvitationIdSchema } from '@/domain/organization/contracts';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getVerifiedUser } from '@/lib/supabase/verified-user';

export const metadata = { title: 'Accept invitation | ModelOps', description: 'Join a ModelOps organization using a verified invitation.' };

const returnLinkClass = [
  'mt-5 inline-flex min-h-11 items-center rounded bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2',
].join(' ');

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ invitation?: string }> }) {
  const parsedInvitation = InvitationIdSchema.safeParse((await searchParams).invitation ?? '');
  if (!parsedInvitation.success) {
    return (
      <AuthFrame title="Invitation link unavailable" description="This invitation link is incomplete or invalid.">
        <p className="text-sm leading-6 text-slate-700">
          Ask the organization administrator to send a new invitation link.
        </p>
        <Link
          href="/login"
          className={returnLinkClass}
        >
          Return to sign in
        </Link>
      </AuthFrame>
    );
  }
  const invitationId = parsedInvitation.data;
  const supabase = await createSupabaseServerClient();
  const user = await getVerifiedUser(supabase);
  if (!user) {
    const next = `/invite/accept?invitation=${encodeURIComponent(invitationId)}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  return (
    <AuthFrame
      title="Accept invitation"
      description="Review the invitation and join with the role selected by the organization administrator."
    >
      <InvitationAcceptance invitationId={invitationId} />
    </AuthFrame>
  );
}
