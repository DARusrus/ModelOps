'use client';

import React, { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ModelCardOutput, ModelOpsInput, UIState, UserApiKeys, PreferredProvider } from '@/types/modelops';
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
import ApiKeyModal from '@/components/modelops/ApiKeyModal';
import { ModelTemplate } from '@/components/modelops/TemplateSelector';
import { ResultViewSkeleton, RunComparisonSkeleton } from '@/components/modelops/Skeletons';
import { Sparkles, RefreshCw, Layers, SearchX, Scale, ArrowLeft, RotateCcw, LayoutGrid, Key } from 'lucide-react';

const RunComparison = dynamic(() => import('@/components/modelops/RunComparison'), {
  loading: () => <RunComparisonSkeleton />,
  ssr: false,
});

const ExportReport = dynamic(() => import('@/components/modelops/ExportReport'), {
  loading: () => (
    <div className="p-4 rounded bg-gray-100 border border-gray-200 animate-pulse h-16" />
  ),
  ssr: false,
});

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
  decision: 'pending_human_review',
};

export default function ModelOpsPage() {
  const [uiState, setUiState] = useState<UIState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ModelCardOutput | null>(null);
  const [lastInput, setLastInput] = useState<ModelOpsInput | null>(null);
  const [showComparison, setShowComparison] = useState<boolean>(false);
  const [sessionHistory, setSessionHistory] = useState<ModelCardOutput[]>([]);
  
  // Initially null so wizard is only revealed after user clicks a template button
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activeTemplateData, setActiveTemplateData] = useState<ModelOpsInput | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Bring-Your-Own-Key (BYOK) State
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [userApiKeys, setUserApiKeys] = useState<UserApiKeys>({
    preferredProvider: 'auto',
  });

  const formRef = useRef<HTMLDivElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  // Load API keys from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('modelops_api_keys');
      if (stored) {
        setUserApiKeys(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleSaveApiKeys = (keys: UserApiKeys) => {
    setUserApiKeys(keys);
    try {
      localStorage.setItem('modelops_api_keys', JSON.stringify(keys));
    } catch {
      // Ignore localStorage errors
    }
  };

  const scrollToForm = () => {
    setIsWizardOpen(true);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const scrollToCompare = () => {
    setShowComparison(true);
    setTimeout(() => {
      compareRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

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

      // Attach user BYOK headers if provided
      if (userApiKeys.groqApiKey) headers['x-groq-api-key'] = userApiKeys.groqApiKey;
      if (userApiKeys.geminiApiKey) headers['x-gemini-api-key'] = userApiKeys.geminiApiKey;
      if (userApiKeys.preferredProvider) headers['x-preferred-provider'] = userApiKeys.preferredProvider;

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
      setSessionHistory((prev) => [data, ...prev]);
      setUiState('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error communicating with server.';
      setErrorMessage(msg);
      setUiState('provider-error');
    }
  };

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
      <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-gray-900 font-sans antialiased">
        {/* Navigation Bar */}
        <Navbar
          onScrollToForm={scrollToForm}
          onScrollToCompare={scrollToCompare}
          onOpenSettings={() => setIsSettingsOpen(true)}
          preferredProvider={userApiKeys.preferredProvider || 'auto'}
        />

        {/* Bring Your Own Key Modal */}
        <ApiKeyModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSaveKeys={handleSaveApiKeys}
          currentKeys={userApiKeys}
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
                      initialData={activeTemplateData}
                      onSubmit={(input) => handleFormSubmit(input, 'normal')}
                      isLoading={uiState === 'loading' || uiState === 'retry'}
                      errors={fieldErrors}
                      onStartOver={handleResetToLanding}
                    />

                    {/* Quick Diagnostic Triggers for Evaluators */}
                    <div className="p-4 rounded bg-gray-50 border border-gray-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                      <span className="text-gray-600 font-medium">Diagnostic Path Testing:</span>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() =>
                            handleFormSubmit(
                              {
                                model_name: 'Test-Model-Err',
                                version: 'v1.0',
                                dataset: 'TestDS',
                                intended_use: 'Validation of error path handling in production',
                                metrics: { accuracy: 0.8 },
                              },
                              'error'
                            )
                          }
                          className="px-3 py-1.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors font-mono text-[11px] cursor-pointer"
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
                                intended_use: 'Validation of empty response path in production',
                                metrics: { accuracy: 0.5 },
                              },
                              'empty'
                            )
                          }
                          className="px-3 py-1.5 rounded bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors font-mono text-[11px] cursor-pointer"
                        >
                          Simulate Empty Result
                        </button>
                      </div>
                    </div>
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

          {/* Dev State Machine Toolbar at Bottom */}
          <div className="mt-8 p-3 bg-white border border-gray-200 rounded text-xs flex flex-wrap items-center justify-between gap-3 text-gray-600">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-[#13715B]" />
              <span className="font-semibold text-gray-800">State Machine Debugger:</span>
              <span className="px-2 py-0.5 rounded font-mono bg-emerald-50 text-[#13715B] border border-emerald-200 font-bold">
                {uiState}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({});
                  setErrorMessage('');
                  setUiState('idle');
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Idle
              </button>
              <button
                type="button"
                onClick={() => setUiState('loading')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Loading
              </button>
              <button
                type="button"
                onClick={() => setUiState('empty')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Empty
              </button>
              <button
                type="button"
                onClick={() => {
                  setFieldErrors({
                    model_name: 'Must be alphanumeric (letters, numbers, - or _ only).',
                  });
                  setErrorMessage('');
                  setUiState('idle');
                }}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
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
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Prov-Err
              </button>
              <button
                type="button"
                onClick={() => setUiState('retry')}
                className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 text-[11px] font-medium transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          </div>
        </main>

        {/* Enterprise Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
}
