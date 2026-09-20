'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutGrid, Loader2 } from 'lucide-react';
import LandingHero from '@/components/modelops/LandingHero';
import WizardForm from '@/components/modelops/WizardForm';
import ErrorState from '@/components/common/ErrorState';
import LoadingState from '@/components/common/LoadingState';
import { ResultViewSkeleton } from '@/components/modelops/Skeletons';
import type { ModelTemplate } from '@/components/modelops/model-templates';
import type { ModelOpsInput } from '@/types/modelops';
import { ApiClientError, requestJson } from '@/lib/client/api';

type ComposerState = 'idle' | 'loading' | 'retry' | 'provider-error';

export default function EvaluationComposer() {
  const router = useRouter();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<ModelOpsInput | null>(null);
  const [state, setState] = useState<ComposerState>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const lastInput = useRef<ModelOpsInput | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  function chooseTemplate(template: ModelTemplate) {
    setActiveTemplateId(template.id);
    setInitialData(template.data);
    setFieldErrors({});
    setErrorMessage('');
    setState('idle');
  }

  function startOver() {
    setActiveTemplateId(null);
    setInitialData(null);
    setFieldErrors({});
    setErrorMessage('');
    setState('idle');
    idempotencyKey.current = null;
  }

  async function submit(input: ModelOpsInput, retry = false) {
    const key = retry && idempotencyKey.current ? idempotencyKey.current : crypto.randomUUID();
    idempotencyKey.current = key;
    lastInput.current = input;
    setState(retry ? 'retry' : 'loading');
    setFieldErrors({});
    setErrorMessage('');
    try {
      const result = await requestJson<{ record_id: string }>('/api/modelops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(input),
      });
      idempotencyKey.current = null;
      router.push(`/evaluations/${result.record_id}`);
    } catch (cause) {
      if (cause instanceof ApiClientError && cause.status < 500 && cause.status !== 408) {
        idempotencyKey.current = null;
        const details = Object.fromEntries((cause.details ?? []).map((detail) => [detail.path, detail.message]));
        setFieldErrors(Object.keys(details).length ? details : { _form: cause.message });
        setState('idle');
        return;
      }
      setErrorMessage(cause instanceof Error ? cause.message : 'The evaluation service could not be reached.');
      setState('provider-error');
    }
  }

  function retry() {
    if (lastInput.current) void submit(lastInput.current, true);
  }

  const busy = state === 'loading' || state === 'retry';

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <Link href="/evaluations" className="inline-flex min-h-11 items-center gap-2 rounded text-sm font-bold text-emerald-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to evaluations
      </Link>

      <div className="mt-4 border border-slate-300 bg-white p-5 sm:p-8">
        <header className="border-b border-slate-300 pb-6">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-800">Governed creation</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">New evaluation</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Choose a starting structure, provide evidence, and persist one organization-scoped dossier.</p>
        </header>

        {!activeTemplateId ? (
          <div className="pt-7">
            <LandingHero compact activeTemplateId={null} onSelectTemplate={chooseTemplate} />
          </div>
        ) : (
          <section aria-labelledby="active-evaluation-template" className="pt-7">
            <div className="mb-6 flex flex-col gap-3 border border-emerald-300 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-slate-600">Active template</p>
                <h2 id="active-evaluation-template" className="mt-1 font-mono text-sm font-black capitalize text-emerald-900">{activeTemplateId.replaceAll('-', ' ')}</h2>
              </div>
              <button type="button" onClick={startOver} disabled={busy} className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Change template
              </button>
            </div>

            <WizardForm
              key={activeTemplateId}
              initialData={initialData}
              onSubmit={submit}
              isLoading={busy}
              errors={fieldErrors}
              onStartOver={startOver}
            />

            {busy && (
              <div className="mt-8 space-y-4" aria-live="polite">
                <LoadingState message={state === 'retry' ? 'Retrying the protected evaluation request…' : 'Evaluating evidence and persisting the governed model card…'} />
                <ResultViewSkeleton />
              </div>
            )}
            {state === 'provider-error' && (
              <div className="mt-8">
                <ErrorState title="Evaluation request failed" message={errorMessage} onRetry={retry} />
              </div>
            )}
            {busy && <p className="sr-only" role="status"><Loader2 className="inline h-4 w-4 animate-spin" /> Evaluation is being processed.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
