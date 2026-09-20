'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import ResultView, { resultTabs, type ResultTab } from '@/components/modelops/ResultView';
import type { EvaluationDetailResponse } from '@/domain/modelops/api-contracts';
import type { ModelCardOutput } from '@/types/modelops';
import { ApiClientError, isAbortError, requestJson } from '@/lib/client/api';

function selectedTab(value: string | null): ResultTab {
  return resultTabs.includes(value as ResultTab) ? value as ResultTab : 'dossier';
}

export default function EvaluationDetail({ evaluationId }: { evaluationId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [card, setCard] = useState<ModelCardOutput | null>(null);
  const [workflowState, setWorkflowState] = useState('');
  const [loadedEvaluationId, setLoadedEvaluationId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const tab = selectedTab(searchParams.get('tab'));
  const loading = loadedEvaluationId !== evaluationId;

  useEffect(() => {
    const controller = new AbortController();
    requestJson<EvaluationDetailResponse>(`/api/modelops/${evaluationId}`, { cache: 'no-store', signal: controller.signal })
      .then((body) => {
        setError('');
        setCard({ ...body.evaluation, record_id: body.evaluation.id });
        setWorkflowState(body.evaluation.workflow_state);
        setLoadedEvaluationId(evaluationId);
      })
      .catch((cause) => {
        if (!isAbortError(cause)) {
          setError(cause instanceof ApiClientError && cause.status === 404 ? 'This evaluation was not found in the active organization.' : cause instanceof Error ? cause.message : 'Evaluation could not be loaded.');
          setLoadedEvaluationId(evaluationId);
        }
      });
    return () => controller.abort();
  }, [evaluationId]);

  function changeTab(nextTab: ResultTab) {
    const query = new URLSearchParams(searchParams.toString());
    if (nextTab === 'dossier') query.delete('tab');
    else query.set('tab', nextTab);
    router.replace(query.size ? `/evaluations/${evaluationId}?${query.toString()}` : `/evaluations/${evaluationId}`, { scroll: false });
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/evaluations" className="inline-flex min-h-11 items-center gap-2 rounded text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to evaluations
        </Link>
        {!loading && workflowState && <span className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold capitalize text-slate-700">Workflow: {workflowState.replaceAll('_', ' ')}</span>}
      </div>

      {loading ? (
        <div role="status" className="flex min-h-72 items-center justify-center gap-2 border border-slate-300 bg-white p-8 text-sm text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Loading persisted evaluation…
        </div>
      ) : error ? (
        <section role="alert" className="border border-rose-300 bg-rose-50 p-6">
          <h1 className="text-xl font-black text-rose-950">Evaluation unavailable</h1>
          <p className="mt-2 text-sm text-rose-900">{error}</p>
          <Link href="/evaluations" className="mt-4 inline-flex min-h-11 items-center rounded bg-rose-900 px-4 text-sm font-bold text-white">Return to the catalog</Link>
        </section>
      ) : card ? (
        <>
          <h1 className="sr-only">Evaluation: {card.model_name} version {card.version}</h1>
          <ResultView
            card={card}
            sessionHistory={[card]}
            activeTab={tab}
            onTabChange={changeTab}
            onNewEvaluation={() => router.push('/evaluations/new')}
          />
        </>
      ) : null}
    </div>
  );
}
