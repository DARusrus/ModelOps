'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronDown, Loader2, SearchX } from 'lucide-react';
import { useWorkspaceRole } from '@/components/app-shell/WorkspaceAccessContext';
import type { EvaluationListResponse, EvaluationSummary } from '@/domain/modelops/api-contracts';
import { canPerform } from '@/lib/auth/permissions';
import { ApiClientError, isAbortError, requestJson } from '@/lib/client/api';
import EvaluationFilters from './EvaluationFilters';

function errorMessage(error: unknown) {
  return error instanceof ApiClientError ? error.message : 'Evaluations could not be loaded.';
}

function workflowLabel(state: EvaluationSummary['workflow_state']) {
  return state.replaceAll('_', ' ');
}

export default function EvaluationCatalog() {
  const role = useWorkspaceRole();
  const searchParams = useSearchParams();
  const filterKey = searchParams.toString();
  const [retry, setRetry] = useState(0);
  const requestKey = `${filterKey}:${retry}`;
  const [result, setResult] = useState<{ key: string; signal: AbortSignal; body: EvaluationListResponse | null; error: string } | null>(null);
  const [page, setPage] = useState<{ signal: AbortSignal; pending: boolean; error: string } | null>(null);
  const activePage = useRef<AbortController | null>(null);
  const current = result?.key === requestKey && !result.signal.aborted ? result : null;
  const loading = !current;
  const evaluations = current?.body?.evaluations ?? [];
  const nextCursor = current?.body?.next_cursor;
  const hasMore = current?.body?.has_more ?? false;
  const currentPage = page && !page.signal.aborted ? page : null;
  const loadingMore = currentPage?.pending ?? false;
  const error = current?.error || currentPage?.error;

  useEffect(() => {
    const controller = new AbortController();
    activePage.current?.abort();
    const query = new URLSearchParams(filterKey);
    query.set('limit', '20');
    query.delete('cursor');
    requestJson<EvaluationListResponse>(`/api/modelops?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, signal: controller.signal, body, error: '' });
      })
      .catch((cause) => {
        if (!controller.signal.aborted && !isAbortError(cause)) {
          setResult({ key: requestKey, signal: controller.signal, body: null, error: errorMessage(cause) });
        }
      });
    return () => {
      controller.abort();
      activePage.current?.abort();
    };
  }, [filterKey, requestKey]);

  async function loadMore() {
    if (!nextCursor || loading || loadingMore || (activePage.current && !activePage.current.signal.aborted)) return;
    const controller = new AbortController();
    activePage.current = controller;
    const query = new URLSearchParams(filterKey);
    query.set('limit', '20');
    query.set('cursor', nextCursor);
    setPage({ signal: controller.signal, pending: true, error: '' });
    try {
      const body = await requestJson<EvaluationListResponse>(`/api/modelops?${query.toString()}`, { cache: 'no-store', signal: controller.signal });
      if (controller.signal.aborted) return;
      setResult((previous) => {
        if (!previous?.body || previous.key !== requestKey || previous.signal.aborted) return previous;
        const known = new Set(previous.body.evaluations.map((evaluation) => evaluation.id));
        const appended = body.evaluations.filter((evaluation) => {
          if (known.has(evaluation.id)) return false;
          known.add(evaluation.id);
          return true;
        });
        return { ...previous, body: { ...body, evaluations: [...previous.body.evaluations, ...appended] } };
      });
    } catch (cause) {
      if (!controller.signal.aborted && !isAbortError(cause)) {
        setPage({ signal: controller.signal, pending: true, error: errorMessage(cause) });
      }
    } finally {
      if (!controller.signal.aborted) {
        setPage((previous) => previous?.signal === controller.signal ? { ...previous, pending: false } : previous);
      }
      if (activePage.current === controller) activePage.current = null;
    }
  }

  return (
    <div className="space-y-6">
      <EvaluationFilters values={new URLSearchParams(filterKey)} />
      <section aria-labelledby="evaluation-results-title" aria-busy={loading || loadingMore} className="border border-slate-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-4 sm:px-5">
          <div>
            <h2 id="evaluation-results-title" className="text-base font-black text-slate-950">Persisted dossiers</h2>
            <p aria-live="polite" className="mt-1 text-xs text-slate-600">
              {loading ? 'Loading records…' : current?.error ? 'Records unavailable' : `${evaluations.length} record${evaluations.length === 1 ? '' : 's'} loaded`}
            </p>
          </div>
          {canPerform(role, 'compare') && (
            <Link href="/compare" className="text-sm font-bold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Compare records</Link>
          )}
        </div>

        {!loading && error && (
          <div role="alert" className="m-4 border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
            <p>{error}</p>
            {current?.error && <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-2 min-h-11 rounded px-3 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Retry</button>}
          </div>
        )}
        {loading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-2 p-8 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading organization records…
          </div>
        ) : current?.error ? null : evaluations.length === 0 ? (
          <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center">
            <SearchX className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <h3 className="mt-3 text-base font-black text-slate-900">No matching evaluations</h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              {canPerform(role, 'evaluate') ? 'Adjust the catalog filters or create a new governed evaluation.' : 'Adjust the catalog filters or ask an editor to create a governed evaluation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table aria-label="Evaluation catalog" className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="p-4">Model</th>
                  <th scope="col" className="p-4">State</th>
                  <th scope="col" className="p-4">Readiness</th>
                  <th scope="col" className="p-4">Created</th>
                  <th scope="col" className="p-4 text-right">Open</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="border-t border-slate-200 hover:bg-slate-50">
                    <td className="p-4">
                      <span className="block font-bold text-slate-950">{evaluation.model_name}</span>
                      <span className="mt-1 block font-mono text-xs text-slate-500">v{evaluation.version}</span>
                    </td>
                    <td className="p-4"><span className="inline-flex rounded border border-slate-300 bg-white px-2 py-1 text-xs font-bold capitalize text-slate-700">{workflowLabel(evaluation.workflow_state)}</span></td>
                    <td className="p-4 font-mono font-bold text-slate-800">{evaluation.readiness_score}/100</td>
                    <td className="p-4 text-slate-600"><time dateTime={evaluation.created_at}>{new Date(evaluation.created_at).toLocaleString()}</time></td>
                    <td className="p-4 text-right">
                      <Link href={`/evaluations/${evaluation.id}`} aria-label={`Open evaluation ${evaluation.model_name} ${evaluation.version}`} className="inline-flex min-h-11 items-center gap-2 rounded px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                        View <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !loading && (
          <div className="border-t border-slate-300 p-4 text-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
              {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              Load more
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
