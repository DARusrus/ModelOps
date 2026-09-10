'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { CompareRunsOutput } from '@/types';
import { GitCompare, X } from 'lucide-react';
import { isAbortError, requestJson } from '@/lib/client/api';

interface RunComparisonProps {
  runA?: ModelCardOutput;
  runB?: ModelCardOutput | null;
  run1?: ModelCardOutput;
  run2?: ModelCardOutput | null;
  /** Retained for caller compatibility; template data is never used as a baseline. */
  templateId?: string | null;
  sessionHistory?: ModelCardOutput[];
  onClose?: () => void;
}

export default function RunComparison({ runA, run2, sessionHistory = [], onClose }: RunComparisonProps) {
  const candidate = runA || run2;
  const candidates = useMemo(
    () => sessionHistory.filter((card) => card.record_id && card.record_id !== candidate?.record_id),
    [candidate?.record_id, sessionHistory],
  );
  const [selectedBaselineId, setSelectedBaselineId] = useState('');
  const [comparison, setComparison] = useState<CompareRunsOutput | null>(null);
  const [error, setError] = useState('');
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => () => activeRequest.current?.abort(), []);

  useEffect(() => {
    setSelectedBaselineId((current) => candidates.some((card) => card.record_id === current) ? current : candidates[0]?.record_id || '');
    setComparison(null);
  }, [candidates]);

  const baseline = candidates.find((card) => card.record_id === selectedBaselineId) || null;

  if (!candidate) return null;

  const compare = async (baselineId: string) => {
    if (!candidate?.record_id || !baselineId) return;
    setError('');
    setComparison(null);
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const body = await requestJson<{ comparison: CompareRunsOutput }>('/api/modelops/compare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseline_id: baselineId, candidate_id: candidate.record_id }), signal: controller.signal });
      if (activeRequest.current !== controller) return;
      setComparison(body.comparison);
    } catch (cause) {
      if (!isAbortError(cause)) setError(cause instanceof Error ? cause.message : 'Comparison failed.');
    } finally {
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  };

  return <section id="compare" aria-label="Authorized model comparison" className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-5 text-gray-900 animate-fadeIn">
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4"><div><p className="text-[11px] font-mono uppercase tracking-wider text-[#13715B]">Authorized run diff</p><h3 className="flex items-center gap-2 text-xl font-bold"><GitCompare className="w-5 h-5 text-[#13715B]" />Evidence-aware comparison</h3><p className="mt-1 text-xs text-gray-600">The server reloads both saved evaluations under your active organization before comparing them.</p></div>{onClose && <button type="button" onClick={onClose} className="rounded bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"><X className="mr-1 inline w-3.5 h-3.5" />Close</button>}</div>
    <div className="flex flex-wrap items-center gap-3 rounded border border-gray-200 bg-gray-50 p-4"><label htmlFor="persisted-baseline" className="text-xs font-semibold">Saved baseline</label><select id="persisted-baseline" value={selectedBaselineId} disabled={candidates.length === 0 || !candidate.record_id} onChange={(event) => { const baselineId = event.target.value; setSelectedBaselineId(baselineId); void compare(baselineId); }} className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs"><option value="">{candidates.length ? 'Choose a saved baseline' : 'No other saved evaluation available'}</option>{candidates.map((card) => <option key={card.record_id} value={card.record_id}>{card.model_name} v{card.version}</option>)}</select></div>
    {!candidate.record_id ? <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Save this evaluation before comparing it.</p> : !baseline ? <p className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Create another saved evaluation in this organization to compare it with this card.</p> : <><div className="grid gap-3 sm:grid-cols-2 text-sm"><div className="rounded border border-gray-200 p-4"><p className="text-xs text-gray-500">Baseline</p><p className="font-bold">{baseline.model_name} v{baseline.version}</p><p className="text-xs">Readiness {baseline.readiness_score}/100</p></div><div className="rounded border border-emerald-200 bg-emerald-50/40 p-4"><p className="text-xs text-gray-500">Candidate</p><p className="font-bold">{candidate.model_name} v{candidate.version}</p><p className="text-xs">Readiness {candidate.readiness_score}/100</p></div></div>{comparison && <div className="overflow-x-auto rounded border border-gray-200"><table aria-label="Comparison metrics" className="w-full text-left text-xs"><thead className="bg-gray-50 text-gray-600"><tr><th scope="col" className="p-3">Metric</th><th scope="col" className="p-3">Baseline</th><th scope="col" className="p-3">Candidate</th><th scope="col" className="p-3">Result</th></tr></thead><tbody>{comparison.metrics_diff.map((metric) => <tr key={metric.metric_name} className="border-t border-gray-200"><td className="p-3 font-mono">{metric.metric_name}</td><td className="p-3">{metric.run1_value === null ? 'Not measured' : metric.run1_value}</td><td className="p-3">{metric.run2_value === null ? 'Not measured' : metric.run2_value}</td><td className="p-3">{metric.comparison_status === 'comparable' ? metric.direction : metric.reason}</td></tr>)}</tbody></table></div>}</>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </section>;
}
