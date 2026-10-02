'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck, FilePlus2, GitCompareArrows, Loader2, RefreshCw, Users } from 'lucide-react';
import { useWorkspaceRole } from '@/components/app-shell/WorkspaceAccessContext';
import type { DashboardActivity, DashboardResponse, DashboardSnapshot } from '@/domain/dashboard/contracts';
import { canPerform } from '@/lib/auth/permissions';
import { isAbortError, requestJson } from '@/lib/client/api';

const workflowLabels: Record<keyof DashboardSnapshot['workflow_counts'], string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes requested',
};

const activityLabels: Record<DashboardActivity['event_type'], string> = {
  organization_created: 'Organization created',
  model_card_created: 'Evaluation created',
  model_card_attested: 'Review state recorded',
  organization_invitation_created: 'Invitation created',
  organization_invitation_renewed: 'Invitation renewed',
  organization_invitation_revoked: 'Invitation revoked',
  organization_invitation_accepted: 'Invitation accepted',
  organization_member_role_changed: 'Member role changed',
  organization_member_removed: 'Member removed',
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function activityText(activity: DashboardActivity) {
  const action = activity.review_action ? ` · ${activity.review_action.replaceAll('_', ' ')}` : '';
  return `${activityLabels[activity.event_type]}${action}`;
}

export default function DashboardOverview() {
  const role = useWorkspaceRole();
  const [dashboard, setDashboard] = useState<DashboardSnapshot | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<DashboardResponse>('/api/dashboard', { cache: 'no-store', signal: controller.signal })
      .then((body) => setDashboard(body.dashboard))
      .catch((cause) => {
        if (!isAbortError(cause)) setError(cause instanceof Error ? cause.message : 'Dashboard could not be loaded.');
      });
    return () => controller.abort();
  }, [reloadKey]);

  if (!dashboard && !error) {
    return <div role="status" className="flex min-h-64 items-center justify-center gap-2 border border-slate-300 bg-white p-8 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading organization state…</div>;
  }

  if (error) {
    return (
      <section role="alert" className="border border-rose-300 bg-rose-50 p-6">
        <h2 className="text-lg font-black text-rose-950">Dashboard unavailable</h2>
        <p className="mt-2 text-sm text-rose-900">{error}</p>
        <button type="button" onClick={() => { setError(''); setDashboard(null); setReloadKey((value) => value + 1); }} className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded bg-rose-900 px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry</button>
      </section>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8">
      <section aria-labelledby="dashboard-state-heading" className="border border-slate-300 bg-white">
        <div className="grid border-b border-slate-300 sm:grid-cols-2">
          <div className="border-b border-slate-300 p-5 sm:border-b-0 sm:border-r">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Active ledger</p>
            <p className="mt-2 text-4xl font-black tabular-nums text-slate-950">{dashboard.active_evaluations}</p>
            <p className="mt-1 text-sm text-slate-600">Unexpired evaluations in this organization</p>
          </div>
          <div className="p-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Reviewer attention</p>
            <p className="mt-2 text-4xl font-black tabular-nums text-emerald-800">{dashboard.review_required}</p>
            <p className="mt-1 text-sm text-slate-600">Submitted or currently under review</p>
          </div>
        </div>
        <div className="p-5">
          <h2 id="dashboard-state-heading" className="text-sm font-black uppercase tracking-wide text-slate-900">Workflow state ledger</h2>
          <dl className="mt-4 grid gap-px overflow-hidden border border-slate-300 bg-slate-300 sm:grid-cols-3 xl:grid-cols-6">
            {Object.entries(dashboard.workflow_counts).map(([state, count]) => (
              <div key={state} className="min-w-0 bg-slate-50 p-4">
                <dt className="text-xs font-semibold leading-5 text-slate-600">{workflowLabels[state as keyof DashboardSnapshot['workflow_counts']]}</dt>
                <dd className="mt-1 font-mono text-xl font-black tabular-nums text-slate-950">{count}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="dashboard-actions-heading">
        <h2 id="dashboard-actions-heading" className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Authorized actions</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/evaluations" className="inline-flex min-h-11 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">Browse evaluations <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          {canPerform(role, 'evaluate') && <Link href="/evaluations/new" className="inline-flex min-h-11 items-center gap-2 rounded bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> New evaluation</Link>}
          {canPerform(role, 'compare') && <Link href="/compare" className="inline-flex min-h-11 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><GitCompareArrows className="h-4 w-4" aria-hidden="true" /> Compare</Link>}
          {canPerform(role, 'review') && <Link href="/reviews" className="inline-flex min-h-11 items-center gap-2 rounded border border-emerald-700 bg-emerald-50 px-4 text-sm font-bold text-emerald-950 hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><ClipboardCheck className="h-4 w-4" aria-hidden="true" /> Review queue</Link>}
          {canPerform(role, 'admin') && <Link href="/settings/members" className="inline-flex min-h-11 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 hover:border-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"><Users className="h-4 w-4" aria-hidden="true" /> Manage team</Link>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
        <section aria-labelledby="recent-evaluations-heading" className="border border-slate-300 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-300 px-5 py-4">
            <h2 id="recent-evaluations-heading" className="text-lg font-black text-slate-950">Recent evaluations</h2>
            <Link href="/evaluations" className="text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">View all</Link>
          </div>
          {dashboard.recent_evaluations.length ? (
            <ul className="divide-y divide-slate-200">
              {dashboard.recent_evaluations.map((evaluation) => (
                <li key={evaluation.id}>
                  <Link href={`/evaluations/${evaluation.id}`} className="grid min-h-20 gap-2 px-5 py-4 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{evaluation.model_name}</span><span className="mt-1 block text-xs text-slate-500">v{evaluation.version} · {formatTime(evaluation.created_at)}</span></span>
                    <span className="flex items-center gap-3 text-xs"><span className="rounded border border-slate-300 px-2 py-1 font-bold capitalize text-slate-700">{evaluation.workflow_state.replaceAll('_', ' ')}</span><span className="font-mono font-black text-emerald-800">{evaluation.readiness_score}/100</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p className="p-6 text-sm leading-6 text-slate-600">No active evaluations yet. Authorized members can create the first governed dossier.</p>}
        </section>

        <section aria-labelledby="recent-activity-heading" className="border border-slate-300 bg-slate-950 text-white">
          <div className="border-b border-slate-700 px-5 py-4"><h2 id="recent-activity-heading" className="text-lg font-black">Recent safe activity</h2><p className="mt-1 text-xs leading-5 text-slate-400">Metadata only. Evidence, reasons, and audit payloads stay protected.</p></div>
          {dashboard.recent_activity.length ? (
            <ol className="divide-y divide-slate-800">
              {dashboard.recent_activity.map((activity) => (
                <li key={activity.id} className="px-5 py-4">
                  <p className="text-sm font-bold text-slate-100">{activityText(activity)}</p>
                  <p className="mt-1 text-xs text-slate-400">{activity.actor_is_current_user ? 'You' : 'Organization member'} · {formatTime(activity.created_at)}</p>
                  {activity.card_id && <Link href={`/evaluations/${activity.card_id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-emerald-300 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">Open evaluation <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" /></Link>}
                </li>
              ))}
            </ol>
          ) : <p className="p-6 text-sm leading-6 text-slate-300">No safe activity entries are available yet.</p>}
        </section>
      </div>
    </div>
  );
}
