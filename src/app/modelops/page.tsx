'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { ModelCardOutput, ModelOpsInput, UIState } from '@/types/modelops';
import InputForm from '@/components/modelops/InputForm';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ResultView from '@/components/modelops/ResultView';
import { ResultViewSkeleton, RunComparisonSkeleton } from '@/components/modelops/Skeletons';
import { Sparkles, RefreshCw, Layers, Lightbulb, SearchX, Scale } from 'lucide-react';

// Dynamic lazy loading for heavy components with skeleton loading fallbacks
const RunComparison = dynamic(() => import('@/components/modelops/RunComparison'), {
  loading: () => <RunComparisonSkeleton />,
  ssr: false,
});

const ExportReport = dynamic(() => import('@/components/modelops/ExportReport'), {
  loading: () => (
    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 animate-pulse h-16" />
  ),
  ssr: false,
});

// Default baseline run for initial comparison demonstration
const baselineRun: ModelCardOutput = {
  model_name: 'ResNet50-Classifier-Baseline',
  version: 'v1.0.0',
  dataset: 'ImageNet-1K-Val',
  metrics: { accuracy: 0.885, f1_score: 0.862, latency_ms: 18.5 },
  intended_use: 'Baseline automated medical image triage for X-ray scans.',
  limitations: ['Degrades under high noise inputs.', 'Higher error rate on edge-case pediatric samples.'],
  risks: ['Out-of-distribution sensor variance.'],
  tests: ['Cross-Validation 5-Fold (Passed)', 'Latency SLA Benchmark (Passed)'],
  reproducibility: 'Deterministic seed 100. sha256:1a2b3c4d...',
  readiness_score: 72,
  decision: 'REQUIRES_HUMAN_REVIEW',
};

// NOTE: 'validation-error' is intentionally NOT rendered as a standalone
// card in the result column anymore. Validation problems belong to specific
// form fields, so they are surfaced inline inside <InputForm /> via the
// `errors` prop, and the page state falls back to 'idle' once they're set.
// Only genuine backend/provider failures (5xx, network errors) use the
// full-width ErrorState card with a Retry action.

export default function ModelOpsPage() {
  const [uiState, setUiState] = useState<UIState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ModelCardOutput | null>(null);
  const [lastInput, setLastInput] = useState<ModelOpsInput | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);

  // Real fetch workflow calling /api/modelops
  const handleFormSubmit = async (input: ModelOpsInput, forceMode?: 'normal' | 'error' | 'empty') => {
    setLastInput(input);
    setUiState('loading');
    setErrorMessage('');
    setFieldErrors({});
    setResult(null);
    setShowComparison(false);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (forceMode === 'error') headers['x-simulate-error'] = 'true';
      if (forceMode === 'empty') headers['x-simulate-empty'] = 'true';

      const res = await fetch('/api/modelops', {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        if (res.status === 404) {
          setUiState('empty');
          return;
        }

        const errorData = await res.json().catch(() => ({ error: 'Evaluation service error' }));

        // 5xx = genuine backend/provider failure -> full error card + retry.
        // 4xx (validation/schema) = belongs to the form, not a separate card.
        if (res.status >= 500) {
          setErrorMessage(errorData.error || `Server responded with status ${res.status}`);
          setUiState('provider-error');
        } else {
          setFieldErrors(
            errorData.fieldErrors ||
            { _form: errorData.error || 'Please review the submitted data and try again.' }
          );
          setUiState('idle');
        }
        return;
      }

      const data: ModelCardOutput = await res.json();
      setResult(data);
      setUiState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error communicating with server.';
      setErrorMessage(msg);
      setUiState('provider-error');
    }
  };

  // Resubmit last form data without forcing user to re-enter inputs
  const handleRetry = () => {
    if (lastInput) {
      setUiState('retry');
      handleFormSubmit(lastInput);
    } else {
      setUiState('idle');
    }
  };

  return (
    <ErrorBoundary fallbackTitle="ModelOps Portal Exception" fallbackMessage="An isolated error occurred while rendering the evaluation interface.">
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 font-sans">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Header */}
          <header className="border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-blue-400 font-semibold text-xs uppercase tracking-widest mb-1">
                <Sparkles className="w-4 h-4 text-blue-400" /> ModelOps Governance Engine
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Model Readiness & Evaluation Portal
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Automated structured model card generation, risk analysis, & human-in-the-loop release decision framework.
              </p>
            </div>

            {/* Dev State Machine Toolbar */}
            <div className="bg-slate-900 border border-slate-800 p-2.5 sm:p-3 rounded-xl flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> State:
              </span>
              <span className="px-2 py-0.5 rounded font-mono bg-blue-950 text-blue-300 border border-blue-800 font-semibold">
                {uiState}
              </span>
              <div className="h-4 w-px bg-slate-800 mx-1 hidden sm:block" />
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setErrorMessage('');
                  setUiState('idle');
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Idle
              </button>
              <button
                type="button"
                onClick={() => setUiState('loading')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Loading
              </button>
              <button
                type="button"
                onClick={() => setUiState('empty')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Empty
              </button>
              <button
                type="button"
                onClick={() => {
                  // Validation errors now surface INLINE in the form, not as
                  // a standalone card. The page state goes back to 'idle'.
                  setFieldErrors({
                    model_name: 'Must be alphanumeric (letters, numbers, - or _ only).',
                  });
                  setErrorMessage('');
                  setUiState('idle');
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Valid-Err
              </button>
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setErrorMessage('Groq/Gemini AI provider quota exceeded (503 Service Unavailable).');
                  setUiState('provider-error');
                }}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Prov-Err
              </button>
              <button
                type="button"
                onClick={() => setUiState('retry')}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Retry
              </button>
            </div>
          </header>

          {/* Main Content Layout */}
          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Input Form Column */}
            <div className="lg:col-span-5 space-y-4">
              <InputForm
                onSubmit={(input) => handleFormSubmit(input, 'normal')}
                isLoading={uiState === 'loading' || uiState === 'retry'}
                errors={fieldErrors}
              />

              {/* Quick Test API Triggers */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                <p className="text-slate-400 font-medium">Quick API Test Triggers:</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleFormSubmit(
                        {
                          model_name: 'Test-Model-Err',
                          version: 'v1.0',
                          dataset: 'TestDS',
                          intended_use: 'Validation of error path handling',
                          metrics: { acc: 0.8 },
                        },
                        'error'
                      )
                    }
                    className="flex-1 px-3 py-1.5 rounded bg-red-950/60 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition-colors font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
                  >
                    Simulate Provider Error
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleFormSubmit(
                        {
                          model_name: 'Test-Model-Empty',
                          version: 'v1.0',
                          dataset: 'UnknownDS',
                          intended_use: 'Validation of empty response path',
                          metrics: { acc: 0.5 },
                        },
                        'empty'
                      )
                    }
                    className="flex-1 px-3 py-1.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50 hover:bg-amber-900/60 transition-colors font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    Simulate Empty Result
                  </button>
                </div>
              </div>
            </div>

            {/* Result / Output Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* State: IDLE */}
              {uiState === 'idle' && (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 flex flex-col items-center justify-center text-center min-h-[380px]">
                  <div className="p-4 rounded-full bg-slate-800/60 text-slate-400 mb-4">
                    <Sparkles className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-200">Ready for Evaluation</h3>
                  <p className="text-sm text-slate-400 max-w-md mt-1">
                    Fill in the experiment parameters on the left and click submit to trigger model evaluation and readiness scoring.
                  </p>
                </div>
              )}

              {/* State: LOADING or RETRY */}
              {(uiState === 'loading' || uiState === 'retry') && (
                <div className="space-y-4">
                  <LoadingState
                    message={
                      uiState === 'retry'
                        ? 'Retrying evaluation pipeline request...'
                        : 'Evaluating model artifacts & generating structured model card...'
                    }
                  />
                  <ResultViewSkeleton />
                </div>
              )}

              {/* State: PROVIDER-ERROR only (genuine backend/network failure) */}
              {uiState === 'provider-error' && (
                <ErrorState
                  title="AI Provider / Network Failure"
                  message={errorMessage || 'Evaluation service could not process the request.'}
                  onRetry={handleRetry}
                />
              )}

              {/* State: EMPTY (Distinct, Actionable No-Match Render) */}
              {uiState === 'empty' && (
                <div role="status" className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-amber-500/30 backdrop-blur-md shadow-xl flex flex-col items-center text-center space-y-4 min-h-[380px] justify-center">
                  <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-800/50 text-amber-400">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h3 className="text-lg font-bold text-slate-100">No Matching Model Artifacts Found</h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      The evaluation query executed successfully, but no registered model benchmarks or dataset records matched your criteria.
                    </p>
                  </div>

                  {/* Actionable Suggestions */}
                  <div className="w-full max-w-md p-4 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-2 text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Actionable Next Steps:
                    </span>
                    <ul className="space-y-1 text-slate-300 list-disc list-inside">
                      <li>Verify the exact model name spelling and version tag format.</li>
                      <li>Ensure the target dataset exists in the artifact registry.</li>
                      <li>Submit a new experiment run specification using the form on the left.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setUiState('idle')}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-amber-600 hover:bg-amber-500 text-white shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset & Retry Search
                  </button>
                </div>
              )}

              {/* State: SUCCESS */}
              {uiState === 'success' && result && (
                <div className="space-y-6">
                  {/* Result Card Render */}
                  <ResultView card={result} />

                  {/* Compare Runs & Export Report Actions */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowComparison(!showComparison)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      <Scale className="w-4 h-4 text-blue-400" />
                      {showComparison ? 'Hide Run Comparison' : 'Compare with Baseline Run (Side-by-Side)'}
                    </button>
                  </div>

                  {/* Side-by-Side Run Comparison View (Lazy Loaded) */}
                  {showComparison && (
                    <RunComparison
                      run1={baselineRun}
                      run2={result}
                      onClose={() => setShowComparison(false)}
                    />
                  )}

                  {/* Export Report Component (Lazy Loaded) */}
                  <ExportReport card={result} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}
