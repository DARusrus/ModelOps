import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

interface AuthFrameProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AuthFrame({ title, description, children, footer }: AuthFrameProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:grid sm:place-items-center sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-md border border-gray-300 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="auth-title">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          <span className="flex h-9 w-9 items-center justify-center rounded bg-[#13715B] text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <span className="font-bold">ModelOps</span>
        </Link>
        <div className="mb-6">
          <h1 id="auth-title" className="text-2xl font-bold tracking-tight text-gray-950">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        </div>
        {children}
        {footer && <div className="mt-6 border-t border-gray-200 pt-5 text-sm text-gray-600">{footer}</div>}
      </section>
    </main>
  );
}
