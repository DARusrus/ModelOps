'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, History, Loader2, RefreshCw } from 'lucide-react';
import { ApiClientError, isAbortError, requestJson } from '@/lib/client/api';
import type { ModelCardOutput } from '@/types/modelops';

interface EvaluationSummary {
  id: string;
  model_name: string;
  version: string;
  readiness_score: number;
  created_at: string;
  expires_at: string;
}

interface EvaluationListResponse {
  success: true;
  evaluations: EvaluationSummary[];
  has_more: boolean;
  next_cursor: string | null;
}

interface EvaluationDetailResponse {
  success: true;
  evaluation: ModelCardOutput & {
    id: string;
    workflow_state: string;
    created_at: string;
    expires_at: string;
  };
}

interface SavedEvaluationsProps {
  refreshKey: number;
  onOpen: (evaluation: ModelCardOutput) => void;
}

function messageFor(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  return 'Saved evaluations could not be loaded.';
}

export default function SavedEvaluations({ refreshKey, onOpen }: SavedEvaluationsProps) {
  const [evaluations, setEvaluations] = useState<EvaluationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<EvaluationListResponse>('/api/modelops?limit=20', { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        setEvaluations(body.evaluations);
        setNextCursor(body.next_cursor);
        setHasMore(body.has_more);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (!isAbortError(requestError)) setError(messageFor(requestError));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refreshKey, reloadKey]);

  const refresh = () => {
    setLoading(true);
    setError('');
    setReloadKey((value) => value + 1);
  };

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const body = await requestJson<EvaluationListResponse>(`/api/modelops?limit=20&cursor=${encodeURIComponent(nextCursor)}`, { cache: 'no-store' });
      setEvaluations((current) => {
        const knownIds = new Set(current.map((item) => item.id));
        return [...current, ...body.evaluations.filter((item) => !knownIds.has(item.id))];
      });
      setNextCursor(body.next_cursor);
      setHasMore(body.has_more);
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setLoadingMore(false);
    }
  };

  const openEvaluation = async (id: string) => {
    setOpeningId(id);
    setError('');
    try {
      const body = await requestJson<EvaluationDetailResponse>(`/api/modelops/${id}`, { cache: 'no-store' });
      onOpen({ ...body.evaluation, record_id: body.evaluation.id });
    } catch (requestError) {
      setError(messageFor(requestError));
    } finally {
      setOpeningId(null);
    }
  };

  return (
    <section id="evaluation-history" aria-labelledby="evaluation-history-title" className="mb-10 scroll-mt-20 rounded-md border border-gray-300 bg-gray-50/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-wider text-[#13715B]">
            <History className="h-4 w-4" /> Organization records
          </p>
          <h2 id="evaluation-history-title" className="mt-1 text-lg font-bold text-gray-900">Saved evaluation history</h2>
          <p className="mt-1 text-xs text-gray-600">Reopen a persisted dossier and continue its authorized review, comparison, or export workflow.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && <p role="alert" className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}

      {loading ? (
        <div role="status" className="mt-4 flex items-center gap-2 text-xs text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading saved evaluations…</div>
      ) : evaluations.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">No saved evaluations exist in this organization yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded border border-gray-200 bg-white">
          <table aria-label="Saved evaluations" className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-gray-100 text-gray-600">
              <tr><th scope="col" className="p-3">Model</th><th scope="col" className="p-3">Version</th><th scope="col" className="p-3">Readiness</th><th scope="col" className="p-3">Created</th><th scope="col" className="p-3 text-right">Action</th></tr>
            </thead>
            <tbody>
              {evaluations.map((evaluation) => (
                <tr key={evaluation.id} className="border-t border-gray-200">
                  <td className="p-3 font-semibold text-gray-900">{evaluation.model_name}</td>
                  <td className="p-3 font-mono text-gray-700">{evaluation.version}</td>
                  <td className="p-3 font-mono text-gray-700">{evaluation.readiness_score}/100</td>
                  <td className="p-3 text-gray-600">{new Date(evaluation.created_at).toLocaleString()}</td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => void openEvaluation(evaluation.id)} disabled={openingId !== null} aria-label={`Open evaluation ${evaluation.model_name} ${evaluation.version}`} className="inline-flex items-center gap-1.5 rounded bg-[#13715B] px-3 py-1.5 font-semibold text-white hover:bg-[#0f5c49] disabled:cursor-not-allowed disabled:opacity-60">
                      {openingId === evaluation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasMore && (
        <div className="mt-4 text-center">
          <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60">
            {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />} Load more
          </button>
        </div>
      )}
    </section>
  );
}
