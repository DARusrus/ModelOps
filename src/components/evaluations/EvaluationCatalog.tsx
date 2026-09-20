'use client';

import { useEffect, useState } from 'react';
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
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadedFilterKey, setLoadedFilterKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const loading = loadedFilterKey !== filterKey;

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams(filterKey);
    query.set('limit', '20');
    query.delete('cursor');
    requestJson<EvaluationListResponse>(`/api/modelops?${query.toString()}`, { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        setError('');
        setEvaluations(body.evaluations);
        setNextCursor(body.next_cursor);
        setHasMore(body.has_more);
        setLoadedFilterKey(filterKey);
      })
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setError(errorMessage(cause));
          setLoadedFilterKey(filterKey);
        }
      });
    return () => controller.abort();
  }, [filterKey]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    const query = new URLSearchParams(filterKey);
    query.set('limit', '20');
    query.set('cursor', nextCursor);
    setLoadingMore(true);
    setError('');
    try {
      const body = await requestJson<EvaluationListResponse>(`/api/modelops?${query.toString()}`, { cache: 'no-store' });
      setEvaluations((current) => {
        const known = new Set(current.map((evaluation) => evaluation.id));
        return [...current, ...body.evaluations.filter((evaluation) => !known.has(evaluation.id))];
      });
      setNextCursor(body.next_cursor);
      setHasMore(body.has_more);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <EvaluationFilters values={new URLSearchParams(filterKey)} />
      <section aria-labelledby="evaluation-results-title" aria-busy={loading} className="border border-slate-300 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 px-4 py-4 sm:px-5">
          <div>
            <h2 id="evaluation-results-title" className="text-base font-black text-slate-950">Persisted dossiers</h2>
            <p aria-live="polite" className="mt-1 text-xs text-slate-600">
              {loading ? 'Loading records…' : `${evaluations.length} record${evaluations.length === 1 ? '' : 's'} loaded`}
            </p>
          </div>
          {canPerform(role, 'compare') && (
            <Link href="/compare" className="text-sm font-bold text-emerald-800 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Compare records</Link>
          )}
        </div>

        {!loading && error && <p role="alert" className="m-4 border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">{error}</p>}
        {loading ? (
          <div role="status" className="flex min-h-48 items-center justify-center gap-2 p-8 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading organization records…
          </div>
        ) : evaluations.length === 0 ? (
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
