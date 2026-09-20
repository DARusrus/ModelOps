'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useWorkspaceRole } from '@/components/app-shell/WorkspaceAccessContext';
import { canPerform } from '@/lib/auth/permissions';

export default function EvaluationPageActions() {
  const role = useWorkspaceRole();
  if (!canPerform(role, 'evaluate')) return null;

  return (
    <Link
      href="/evaluations/new"
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-emerald-800 px-4 text-sm font-bold text-white transition-colors hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      New evaluation
    </Link>
  );
}
