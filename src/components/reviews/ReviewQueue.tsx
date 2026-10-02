'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import type { ReviewQueueFilter, ReviewQueueResponse } from '@/domain/reviews/contracts';
import { isAbortError, requestJson } from '@/lib/client/api';

const filters: Array<{ value: ReviewQueueFilter; label: string }> = [
  { value: 'all', label: 'All pending' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under_review', label: 'Under review' },
];

function formatTime(value: string | null) {
  if (!value) return 'No review event yet';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export default function ReviewQueue({ initialState }: { initialState: ReviewQueueFilter }) {
  const router = useRouter();
  // The route prop is authoritative, including refresh and browser back/forward.
  const state = initialState;
  const [result, setResult] = useState<{ key: string; body: ReviewQueueResponse | null; error: string } | null>(null);
  const [pageState, setPageState] = useState<{ key: string; signal: AbortSignal; pending: boolean; error: string } | null>(null);
  const activePage = useRef<AbortController | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const key = `${state}:${reloadKey}`;
  const current = result?.key === key ? result : null;
  const records = current?.body?.reviews || [];
  const nextCursor = current?.body?.next_cursor;
  const loading = !current;
  const currentPage = pageState?.key === key && !pageState.signal.aborted ? pageState : null;
  const loadingMore = currentPage?.pending || false;
  const error = current?.error || currentPage?.error || '';

  useEffect(() => {
    const controller = new AbortController();
    activePage.current?.abort();
    requestJson<ReviewQueueResponse>(`/api/reviews?state=${state}&limit=20`, { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        if (!controller.signal.aborted) setResult({ key, body, error: '' });
      })
      .catch((cause) => {
        if (!controller.signal.aborted && !isAbortError(cause)) setResult({ key, body: null, error: cause instanceof Error ? cause.message : 'Review queue could not be loaded.' });
      });
    return () => { controller.abort(); activePage.current?.abort(); };
  }, [state, key]);

  function selectState(nextState: ReviewQueueFilter) {
    if (nextState === state) return;
    router.replace(nextState === 'all' ? '/reviews' : `/reviews?state=${nextState}`, { scroll: false });
  }

  async function loadMore() {
    if (!nextCursor || loadingMore || loading) return;
    activePage.current?.abort();
    const controller = new AbortController();
    activePage.current = controller;
    setPageState({ key, signal: controller.signal, pending: true, error: '' });
    try {
      const body = await requestJson<ReviewQueueResponse>(`/api/reviews?state=${state}&limit=20&cursor=${encodeURIComponent(nextCursor)}`, { cache: 'no-store', signal: controller.signal });
      if (!controller.signal.aborted) setResult((previous) => previous?.key === key && previous.body
        ? { key, error: '', body: { ...body, reviews: [...previous.body.reviews, ...body.reviews] } } : previous);
    } catch (cause) {
      if (!controller.signal.aborted && !isAbortError(cause)) setPageState({ key, signal: controller.signal, pending: false, error: cause instanceof Error ? cause.message : 'More review records could not be loaded.' });
    } finally {
      if (!controller.signal.aborted) setPageState((previous) => previous?.key === key ? { ...previous, pending: false } : previous);
    }
  }

  return (
    <section aria-labelledby="review-queue-heading" className="space-y-5">
      <div className="flex flex-col gap-4 border border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="review-queue-heading" className="text-sm font-black uppercase tracking-wide text-slate-900">Pending review state</h2>
          <p className="mt-1 text-xs leading-5 text-slate-600">Drafts and changes requested are intentionally excluded.</p>
        </div>
        <div role="group" aria-label="Filter review queue" className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={state === filter.value}
              onClick={() => selectState(filter.value)}
              className={`min-h-11 cursor-pointer rounded border px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 ${state === filter.value ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-emerald-700 hover:text-emerald-900'}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900">
          <span>{error}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded bg-rose-900 px-4 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-800 focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Retry</button>
        </div>
      )}

      {loading ? (
        <div role="status" className="flex min-h-64 items-center justify-center gap-2 border border-slate-300 bg-white p-8 text-sm text-slate-600"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading review queue…</div>
      ) : records.length ? (
        <div className="space-y-3">
          {records.map((record) => (
            <article key={record.id} className="border border-slate-300 bg-white p-5">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-black text-slate-950">{record.model_name}</h3>
                    <span className="rounded border border-slate-300 px-2 py-1 text-xs font-bold capitalize text-slate-700">{record.workflow_state.replaceAll('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Version {record.version} · Author {record.author_email}</p>
                  <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                    <div><dt className="font-bold uppercase tracking-wide text-slate-500">Readiness</dt><dd className="mt-1 font-mono text-base font-black text-emerald-800">{record.readiness_score}/100</dd></div>
                    <div><dt className="font-bold uppercase tracking-wide text-slate-500">Created</dt><dd className="mt-1 text-slate-800">{formatTime(record.created_at)}</dd></div>
                    <div><dt className="font-bold uppercase tracking-wide text-slate-500">Latest review event</dt><dd className="mt-1 text-slate-800">{formatTime(record.last_review_at)}</dd></div>
                  </dl>
                </div>
                <Link href={`/evaluations/${record.id}?tab=policy`} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">Open review <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
            </article>
          ))}
          {nextCursor && <div className="pt-2 text-center"><button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded border border-slate-400 bg-white px-5 text-sm font-bold text-slate-800 hover:border-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{loadingMore ? 'Loading…' : 'Load more'}</button></div>}
        </div>
      ) : !error ? (
        <div className="border border-dashed border-slate-400 bg-white p-8 text-center"><h2 className="text-lg font-black text-slate-950">No evaluations require review</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">This queue contains only submitted and under-review records in the active organization.</p></div>
      ) : null}
    </section>
  );
}
