import Link from 'next/link';
import AuthFrame from '@/components/auth/AuthFrame';
import ForgotPasswordForm from './ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <AuthFrame title="Reset your password" description="Request a single-use recovery link for your account." footer={<Link href="/login" className="font-semibold text-emerald-800 underline-offset-4 hover:underline">Return to sign in</Link>}>
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
