'use client';

import React, { useState, useRef } from 'react';
import { ModelCardOutput, ModelOpsInput, UIState } from '@/types/modelops';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LandingHero from '@/components/modelops/LandingHero';
import WizardForm from '@/components/modelops/WizardForm';
import ResultView from '@/components/modelops/ResultView';
import GovernanceInfoCard from '@/components/modelops/GovernanceInfoCard';
import LandingFeatures from '@/components/modelops/LandingFeatures';
import LoadingState from '@/components/common/LoadingState';
import ErrorState from '@/components/common/ErrorState';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { ModelTemplate } from '@/components/modelops/TemplateSelector';
import { ResultViewSkeleton } from '@/components/modelops/Skeletons';
import { ArrowLeft, RotateCcw, LayoutGrid, RefreshCw, SearchX } from 'lucide-react';
import { ApiClientError, requestJson } from '@/lib/client/api';
import SavedEvaluations from '@/components/modelops/SavedEvaluations';

export default function ModelOpsWorkspace() {
  const [uiState, setUiState] = useState<UIState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ModelCardOutput | null>(null);
  const [lastInput, setLastInput] = useState<ModelOpsInput | null>(null);
  const [sessionHistory, setSessionHistory] = useState<ModelCardOutput[]>([]);
  const [savedEvaluationsRefreshKey, setSavedEvaluationsRefreshKey] = useState(0);
  
  // Initially null so wizard is only revealed after user clicks a template button
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateData, setActiveTemplateData] = useState<ModelOpsInput | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  const formRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const evaluationIdempotencyKey = useRef<string | null>(null);

  const scrollToForm = () => {
    setIsWizardOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const scrollToHistory = () => historyRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSelectTemplate = (template: ModelTemplate) => {
    setActiveTemplateId(template.id);
    setActiveTemplateData(template.data);
    setIsWizardOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleResetToLanding = () => {
    setIsWizardOpen(false);
    setActiveTemplateId(null);
    setActiveTemplateData(null);
    setResult(null);
    setUiState('idle');
  };

  const handleApplyFixesFromSimulator = (simulatedCard: ModelCardOutput) => {
    // Merge simulated fixes back into form input and switch to idle
    const updatedInput: ModelOpsInput = {
      model_name: simulatedCard.model_name,
      version: simulatedCard.version,
      dataset: simulatedCard.dataset,
      intended_use: simulatedCard.intended_use,
      metrics: simulatedCard.metrics,
      limitations: simulatedCard.limitations,
      risks: simulatedCard.risks,
      tests: simulatedCard.tests,
      warnings: simulatedCard.warnings,
      reproducibility: simulatedCard.reproducibility,
      mitigations: simulatedCard.metadata?.mitigations,
      training_dataset: simulatedCard.metadata?.training_dataset,
      eval_preprocessing: simulatedCard.metadata?.eval_preprocessing,
    };

    setActiveTemplateData(updatedInput);
    setUiState('idle');
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleFormSubmit = async (input: ModelOpsInput, retry = false) => {
    const key = retry && evaluationIdempotencyKey.current ? evaluationIdempotencyKey.current : crypto.randomUUID();
    evaluationIdempotencyKey.current = key;
    setLastInput(input);
    setUiState('loading');
    setErrorMessage('');
    setFieldErrors({});
    setResult(null);

    try {
      const data = await requestJson<ModelCardOutput>('/api/modelops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify(input),
      });
      evaluationIdempotencyKey.current = null;
      setResult(data);
      setSessionHistory((prev) => [data, ...prev.filter((item) => item.record_id !== data.record_id)]);
      setSavedEvaluationsRefreshKey((value) => value + 1);
      setUiState('success');
    } catch (err: unknown) {
      if (err instanceof ApiClientError && err.status === 404) {
        evaluationIdempotencyKey.current = null;
        setUiState('empty');
        return;
      }
      if (err instanceof ApiClientError && err.status < 500 && err.status !== 408) {
        evaluationIdempotencyKey.current = null;
        const details = Object.fromEntries((err.details || []).map((detail) => [detail.path, detail.message]));
        setFieldErrors(Object.keys(details).length > 0 ? details : { _form: err.message });
        setUiState('idle');
        return;
      }
      const msg = err instanceof Error ? err.message : 'Network error communicating with server.';
      setErrorMessage(msg);
      setUiState('provider-error');
    }
  };

  const handleRetry = () => {
    if (lastInput) {
      setUiState('retry');
      handleFormSubmit(lastInput, true);
    } else {
      setUiState('idle');
    }
  };

  const handleOpenSavedEvaluation = (evaluation: ModelCardOutput) => {
    setResult(evaluation);
    setSessionHistory((current) => [evaluation, ...current.filter((item) => item.record_id !== evaluation.record_id)]);
    setActiveTemplateId('saved-evaluation');
    setActiveTemplateData(null);
    setIsWizardOpen(true);
    setErrorMessage('');
    setFieldErrors({});
    setUiState('success');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <ErrorBoundary fallbackTitle="ModelOps Portal Exception" fallbackMessage="An isolated error occurred while rendering the evaluation interface.">
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-gray-900 font-sans antialiased">
        {/* Navigation Bar */}
        <Navbar
          onScrollToForm={scrollToForm}
          onScrollToHistory={scrollToHistory}
        />

        {/* Main Application Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-20 pb-16">
          
          {/* Outer White Card Container matching VerifyWise max-w-[1200px] frame */}
          <div className="bg-white border border-gray-300 p-6 sm:p-12 shadow-xs rounded-md">
            
            {/* Landing Hero & 6 Template Cards */}
            <LandingHero
              activeTemplateId={activeTemplateId}
              onSelectTemplate={handleSelectTemplate}
            />

            <div ref={historyRef}>
              <SavedEvaluations refreshKey={savedEvaluationsRefreshKey} onOpen={handleOpenSavedEvaluation} />
            </div>

            {/* Generator Wizard Section: ONLY appears when a template button is clicked! */}
            {isWizardOpen && (
              <div ref={formRef} className="pt-8 border-t border-gray-200 animate-fadeIn">
                
                {/* Header bar above the wizard with active template indicator and return link */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/50 border border-emerald-200 rounded text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#13715B]" />
                    <span className="font-semibold text-gray-800">Active Template Configuration:</span>
                    <span className="px-2 py-0.5 bg-white border border-emerald-300 rounded font-mono font-bold text-[#13715B] capitalize">
                      {activeTemplateId ? activeTemplateId.replace('-', ' ') : 'Custom Model'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetToLanding}
                    className="inline-flex items-center gap-1 text-gray-600 hover:text-gray-900 font-medium underline underline-offset-4 cursor-pointer"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    Change / Close Template
                  </button>
                </div>

                {/* If result is NOT generated yet, show the 9-Step Wizard */}
                {uiState !== 'success' && (
                  <div className="space-y-6">
                    <WizardForm
                      key={activeTemplateId ?? 'custom'}
                      initialData={activeTemplateData}
                      onSubmit={handleFormSubmit}
                      isLoading={uiState === 'loading' || uiState === 'retry'}
                      errors={fieldErrors}
                      onStartOver={handleResetToLanding}
                    />

                  </div>
                )}

                {/* State: LOADING or RETRY */}
                {(uiState === 'loading' || uiState === 'retry') && (
                  <div className="mt-8 space-y-4 animate-fadeIn">
                    <LoadingState
                      message={
                        uiState === 'retry'
                          ? 'Retrying evaluation pipeline request...'
                          : 'Evaluating model artifacts, computing deterministic readiness rubric & generating structured model card...'
                      }
                    />
                    <ResultViewSkeleton />
                  </div>
                )}

                {/* State: PROVIDER-ERROR */}
                {uiState === 'provider-error' && (
                  <div className="mt-8">
                    <ErrorState
                      title="AI Provider / Network Failure"
                      message={errorMessage || 'Evaluation service could not process the request.'}
                      onRetry={handleRetry}
                    />
                  </div>
                )}

                {/* State: EMPTY */}
                {uiState === 'empty' && (
                  <div className="mt-8">
                    <div role="status" className="p-8 rounded border border-amber-300 bg-amber-50/40 shadow-xs flex flex-col items-center text-center space-y-4 justify-center">
                      <div className="p-3.5 rounded-full bg-amber-100 text-amber-700">
                        <SearchX className="w-7 h-7" />
                      </div>
                      <div className="space-y-1 max-w-md">
                        <h3 className="text-base font-bold text-gray-900">No Matching Model Artifacts Found</h3>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          The evaluation query executed successfully, but no registered model benchmarks or dataset records matched your criteria.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setUiState('idle')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded bg-amber-700 hover:bg-amber-800 text-white shadow-xs transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset & Retry
                      </button>
                    </div>
                  </div>
                )}

                {/* State: SUCCESS (Render Full Dossier) */}
                {uiState === 'success' && result && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Top Back / Edit Form Button */}
                    <div className="flex items-center justify-between pb-2">
                      <button
                        type="button"
                        onClick={() => setUiState('idle')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#13715B] hover:text-[#0f5c49] bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 cursor-pointer transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Edit Specifications / Back to Wizard
                      </button>

                      <button
                        type="button"
                        onClick={handleResetToLanding}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Start New Evaluation
                      </button>
                    </div>

                    {/* Rendered Model Card View with All 5 Intelligence Tabs */}
                    <ResultView
                      card={result}
                      templateId={activeTemplateId}
                      sessionHistory={sessionHistory}
                      onNewEvaluation={() => setUiState('idle')}
                      onApplyFixes={handleApplyFixesFromSimulator}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Educational Info Card */}
            <div className="mt-12">
              <GovernanceInfoCard />
            </div>

            {/* Landing Features, How It Works, and FAQ */}
            <LandingFeatures />
          </div>

        </main>

        {/* Enterprise Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
