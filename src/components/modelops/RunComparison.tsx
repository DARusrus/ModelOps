'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { GitCompare, Loader2, X } from 'lucide-react';
import type { EvaluationDetailResponse, EvaluationListResponse } from '@/domain/modelops/api-contracts';
import type { ModelCardOutput } from '@/types/modelops';
import type { CompareRunsOutput } from '@/types';
import { isAbortError, requestJson } from '@/lib/client/api';

interface RunComparisonProps {
  runA?: ModelCardOutput;
  runB?: ModelCardOutput | null;
  run1?: ModelCardOutput;
  run2?: ModelCardOutput | null;
  /** Retained for compatibility with the legacy workspace. */
  templateId?: string | null;
  sessionHistory?: ModelCardOutput[];
  initialCandidateId?: string;
  initialBaselineId?: string;
  onClose?: () => void;
}

interface ComparisonOption {
  id: string;
  modelName: string;
  version: string;
  readinessScore: number;
}

function optionFromCard(card: ModelCardOutput): ComparisonOption | null {
  return card.record_id ? { id: card.record_id, modelName: card.model_name, version: card.version, readinessScore: card.readiness_score } : null;
}

export default function RunComparison({
  runA,
  run1,
  run2,
  sessionHistory = [],
  initialCandidateId = '',
  initialBaselineId = '',
  onClose,
}: RunComparisonProps) {
  const fixedCandidate = runA ?? run1 ?? run2 ?? null;
  const fixedCandidateOption = fixedCandidate ? optionFromCard(fixedCandidate) : null;
  const [persistedOptions, setPersistedOptions] = useState<ComparisonOption[]>([]);
  const [requestedCandidateId, setRequestedCandidateId] = useState(initialCandidateId);
  const [requestedBaselineId, setRequestedBaselineId] = useState(initialBaselineId);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [comparison, setComparison] = useState<{ baselineId: string; candidateId: string; value: CompareRunsOutput } | null>(null);
  const [error, setError] = useState('');
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    requestJson<EvaluationListResponse>('/api/modelops?limit=50', { cache: 'no-store', signal: controller.signal })
      .then(async (body) => {
        const loaded = body.evaluations.map((evaluation) => ({
          id: evaluation.id,
          modelName: evaluation.model_name,
          version: evaluation.version,
          readinessScore: evaluation.readiness_score,
        }));
        const known = new Set(loaded.map((option) => option.id));
        for (const id of [initialCandidateId, initialBaselineId]) {
          if (!id || known.has(id)) continue;
          try {
            const detail = await requestJson<EvaluationDetailResponse>(`/api/modelops/${id}`, { cache: 'no-store', signal: controller.signal });
            loaded.push({ id, modelName: detail.evaluation.model_name, version: detail.evaluation.version, readinessScore: detail.evaluation.readiness_score });
            known.add(id);
          } catch (cause) {
            if (isAbortError(cause)) throw cause;
          }
        }
        setPersistedOptions(loaded);
      })
      .catch((cause) => {
        if (!isAbortError(cause)) setError(cause instanceof Error ? cause.message : 'Saved evaluations could not be loaded.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingOptions(false);
      });
    return () => controller.abort();
  }, [initialBaselineId, initialCandidateId]);

  useEffect(() => () => activeRequest.current?.abort(), []);

  const options = useMemo(() => {
    const merged = new Map<string, ComparisonOption>();
    for (const card of sessionHistory) {
      const option = optionFromCard(card);
      if (option) merged.set(option.id, option);
    }
    for (const option of persistedOptions) merged.set(option.id, option);
    if (fixedCandidateOption) merged.set(fixedCandidateOption.id, fixedCandidateOption);
    return Array.from(merged.values());
  }, [fixedCandidateOption, persistedOptions, sessionHistory]);

  const candidateId = fixedCandidateOption?.id ?? requestedCandidateId;
  const candidate = options.find((option) => option.id === candidateId) ?? fixedCandidateOption;
  const baselineOptions = options.filter((option) => option.id !== candidateId);
  const baseline = baselineOptions.find((option) => option.id === requestedBaselineId) ?? null;
  const activeComparison = comparison?.baselineId === requestedBaselineId && comparison.candidateId === candidateId
    ? comparison.value
    : null;

  async function compare(baselineId: string, selectedCandidateId = candidateId) {
    if (!selectedCandidateId || !baselineId || selectedCandidateId === baselineId) return;
    setError('');
    setComparison(null);
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const body = await requestJson<{ comparison: CompareRunsOutput }>('/api/modelops/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseline_id: baselineId, candidate_id: selectedCandidateId }),
        signal: controller.signal,
      });
      if (activeRequest.current === controller) setComparison({ baselineId, candidateId: selectedCandidateId, value: body.comparison });
    } catch (cause) {
      if (!isAbortError(cause)) setError(cause instanceof Error ? cause.message : 'Comparison failed.');
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }

  const selectClass = 'min-h-11 min-w-64 rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-100';

  return (
    <section id="compare" aria-label="Authorized model comparison" className="space-y-5 rounded-md border border-slate-300 bg-white p-6 text-slate-900 shadow-xs sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-800">Authorized run diff</p>
          <h2 className="flex items-center gap-2 text-xl font-black"><GitCompare className="h-5 w-5 text-emerald-800" aria-hidden="true" />Evidence-aware comparison</h2>
          <p className="mt-1 text-sm text-slate-600">The server reloads both persisted IDs inside the active organization before comparing them.</p>
        </div>
        {onClose && <button type="button" onClick={onClose} className="inline-flex min-h-11 cursor-pointer items-center rounded bg-slate-100 px-3 text-sm font-bold text-slate-700 hover:bg-slate-200"><X className="mr-1 h-4 w-4" aria-hidden="true" />Close</button>}
      </div>

      <div className="grid gap-4 border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
        {!fixedCandidateOption && (
          <label className="text-xs font-bold text-slate-700">
            Saved candidate
            <select aria-label="Saved candidate" value={candidateId} disabled={loadingOptions} onChange={(event) => { setRequestedCandidateId(event.target.value); setRequestedBaselineId(''); setComparison(null); }} className={`${selectClass} mt-1 w-full`}>
              <option value="">Choose a candidate</option>
              {options.map((option) => <option key={option.id} value={option.id}>{option.modelName} v{option.version}</option>)}
            </select>
          </label>
        )}
        <label className="text-xs font-bold text-slate-700">
          Saved baseline
          <select aria-label="Saved baseline" value={baseline?.id ?? ''} disabled={loadingOptions || !candidateId || baselineOptions.length === 0} onChange={(event) => { const baselineId = event.target.value; setRequestedBaselineId(baselineId); void compare(baselineId); }} className={`${selectClass} mt-1 w-full`}>
            <option value="">{baselineOptions.length ? 'Choose a saved baseline' : 'No other saved evaluation available'}</option>
            {baselineOptions.map((option) => <option key={option.id} value={option.id}>{option.modelName} v{option.version}</option>)}
          </select>
        </label>
      </div>

      {!fixedCandidateOption && candidate && baseline && !activeComparison && (
        <button type="button" onClick={() => void compare(baseline.id, candidate.id)} className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded bg-emerald-800 px-4 text-sm font-bold text-white hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2">
          Run comparison
        </button>
      )}

      {loadingOptions && <p role="status" className="flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading authorized records…</p>}
      {!loadingOptions && (!candidate || !baseline) && <p className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Choose two different saved evaluations to produce a server-authorized comparison.</p>}

      {candidate && baseline && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded border border-slate-200 p-4"><p className="text-xs text-slate-500">Baseline</p><p className="font-bold">{baseline.modelName} v{baseline.version}</p><p className="text-xs">Readiness {baseline.readinessScore}/100</p></div>
          <div className="rounded border border-emerald-300 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Candidate</p><p className="font-bold">{candidate.modelName} v{candidate.version}</p><p className="text-xs">Readiness {candidate.readinessScore}/100</p></div>
        </div>
      )}

      {activeComparison && (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table aria-label="Comparison metrics" className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-100 text-slate-600"><tr><th scope="col" className="p-3">Metric</th><th scope="col" className="p-3">Baseline</th><th scope="col" className="p-3">Candidate</th><th scope="col" className="p-3">Result</th></tr></thead>
            <tbody>{activeComparison.metrics_diff.map((metric) => <tr key={metric.metric_name} className="border-t border-slate-200"><td className="p-3 font-mono">{metric.metric_name}</td><td className="p-3">{metric.run1_value === null ? 'Not measured' : metric.run1_value}</td><td className="p-3">{metric.run2_value === null ? 'Not measured' : metric.run2_value}</td><td className="p-3">{metric.comparison_status === 'comparable' ? metric.direction : metric.reason}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {error && <p role="alert" className="border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    </section>
  );
}
