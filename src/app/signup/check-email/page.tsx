import Link from 'next/link';
import AuthFrame from '@/components/auth/AuthFrame';

export default function CheckEmailPage() {
  return (
    <AuthFrame title="Check your email" description="If the address is eligible, Supabase has sent a confirmation link. Open it in the same browser to finish creating your session." footer={<Link href="/login" className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Return to sign in</Link>}>
      <div role="status" className="rounded border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
        For privacy, this page does not confirm whether an account already exists for that address. Confirmation links expire and can be used only once.
      </div>
    </AuthFrame>
  );
}
