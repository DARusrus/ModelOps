'use client';

import React, { useState } from 'react';
import { ModelOpsInput } from '@/types/modelops';
import {
  ChevronLeft,
  ChevronRight,
  Info,
  AlertTriangle,
  Plus,
  Trash2,
  FileCheck,
  Zap
} from 'lucide-react';

export interface WizardFormData {
  // Step 1: Model details
  model_name: string;
  version: string;
  model_type: string;
  architecture: string;
  developed_by: string;
  release_date: string;
  license: string;

  // Step 2: Intended use
  intended_use: string;
  primary_uses: string;
  out_of_scope_uses: string;
  target_users: string;

  // Step 3: Factors
  factors: string;
  environment: string;

  // Step 4: Metrics
  selectedMetricTypes: string[];
  metrics: Record<string, number>;
  metric_unit: string;
  evaluation_reference: string;
  decision_thresholds: string;
  variation_approaches: string;

  // Step 5: Evaluation data
  dataset: string;
  eval_preprocessing: string;
  data_split: string;

  // Step 6: Training data
  training_dataset: string;
  data_volume: string;

  // Step 7: Quantitative analysis
  disaggregated_results: string;
  subgroup_benchmarks: string;

  // Step 8: Ethical considerations
  data_classification: 'unclassified' | 'public' | 'internal' | 'confidential' | 'restricted';
  uses_sensitive_data: boolean;
  impacts_human_life: boolean;
  risks_and_harms: string;
  mitigations: string;
  use_case_considerations: string;

  // Step 9: Caveats and recommendations
  limitations: string;
  reproducibility: string;
  reproducibility_seed: string;
  source_revision: string;
  environment_reference: string;
  test_reference: string;
  test_executed_at: string;
  test_result: '' | 'passed' | 'failed' | 'inconclusive';
  recommendations: string;
}

const SECTION_TITLES = [
  { title: 'Model details', desc: 'Basic information about the model including its name, version, and ownership.' },
  { title: 'Intended use', desc: 'Define primary use cases, out-of-scope applications, and target user personas.' },
  { title: 'Factors', desc: 'Demographic factors, environmental considerations, and runtime instrumentation.' },
  { title: 'Metrics', desc: 'Define how model performance is measured, evaluated, and tracked against SLA targets.' },
  { title: 'Evaluation data', desc: 'Benchmark datasets, preprocessing pipelines, and validation split configurations.' },
  { title: 'Training data', desc: 'Training data sources, pretraining corpora provenance, and sample volumes.' },
  { title: 'Quantitative analyses', desc: 'Disaggregated evaluation results, subgroup disparities, and accuracy distributions.' },
  { title: 'Ethical considerations', desc: 'Document potential risks, systemic biases, sensitive data handling, and ethical guardrails.' },
  { title: 'Caveats and recommendations', desc: 'Operational caveats, reproducibility seed audit trail, and human sign-off instructions.' },
];

const METRIC_CHECKBOXES = ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'Latency (ms)', 'Loss', 'AUC-ROC', 'Top-5 Accuracy'];

interface WizardFormProps {
  initialData?: ModelOpsInput | null;
  onSubmit: (input: ModelOpsInput) => void;
  isLoading: boolean;
  errors?: Record<string, string>;
  onStartOver?: () => void;
}

export default function WizardForm({
  initialData,
  onSubmit,
  isLoading,
  errors = {},
  onStartOver,
}: WizardFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    model_name: initialData?.model_name || '',
    version: initialData?.version || '',
    model_type: initialData?.model_type || '',
    architecture: initialData?.architecture || '',
    developed_by: initialData?.developed_by || '',
    release_date: initialData?.release_date || '',
    license: initialData?.license || '',

    intended_use: initialData?.intended_use || '',
    primary_uses: initialData?.primary_uses || '',
    out_of_scope_uses: initialData?.out_of_scope_uses || '',
    target_users: initialData?.target_users || '',

    factors: initialData?.factors || '',
    environment: initialData?.environment || '',

    selectedMetricTypes: Object.keys(initialData?.metrics || {}),
    metrics: initialData?.metrics || {},
    metric_unit: '', evaluation_reference: '',
    decision_thresholds: initialData?.decision_thresholds || '',
    variation_approaches: initialData?.variation_approaches || '',

    dataset: initialData?.dataset || '',
    eval_preprocessing: initialData?.eval_preprocessing || '',
    data_split: initialData?.data_split || '',

    training_dataset: initialData?.training_dataset || '',
    data_volume: initialData?.data_volume || '',

    disaggregated_results: initialData?.disaggregated_results || '',
    subgroup_benchmarks: initialData?.subgroup_benchmarks || '',

    data_classification: initialData?.data_classification || 'unclassified',
    uses_sensitive_data: initialData?.uses_sensitive_data ?? false,
    impacts_human_life: initialData?.impacts_human_life ?? false,
    risks_and_harms: typeof initialData?.risks === 'string' ? initialData.risks : Array.isArray(initialData?.risks) ? initialData.risks.join(', ') : (initialData?.risks_and_harms || ''),
    mitigations: initialData?.mitigations || '',
    use_case_considerations: '',

    limitations: typeof initialData?.limitations === 'string' ? initialData.limitations : Array.isArray(initialData?.limitations) ? initialData.limitations.join(', ') : '',
    reproducibility: initialData?.reproducibility || '',
    reproducibility_seed: '', source_revision: '', environment_reference: '', test_reference: '', test_executed_at: '', test_result: '',
    recommendations: initialData?.recommendations || '',
  });

  const [metricKeyInput, setMetricKeyInput] = useState('');
  const [metricValInput, setMetricValInput] = useState('');
  const [submissionHint, setSubmissionHint] = useState('');

  const updateField = <K extends keyof WizardFormData>(key: K, value: WizardFormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddCustomMetric = () => {
    if (!metricKeyInput.trim()) return;
    const num = parseFloat(metricValInput);
    const val = Number.isNaN(num) ? 0 : num;
    setFormData((prev) => ({
      ...prev,
      metrics: {
        ...prev.metrics,
        [metricKeyInput.trim().toLowerCase().replace(/\s+/g, '_')]: val,
      },
    }));
    setMetricKeyInput('');
    setMetricValInput('');
  };

  const handleRemoveMetric = (key: string) => {
    setFormData((prev) => {
      const copy = { ...prev.metrics };
      delete copy[key];
      return { ...prev, metrics: copy };
    });
  };

  const calculateCompletionPercent = () => {
    const declaredTests = [formData.disaggregated_results, formData.subgroup_benchmarks, formData.variation_approaches].some((value) => value.trim().length > 0);
    const evidenceGroups = [
      Boolean(formData.model_name.trim() && formData.version.trim()),
      Boolean(formData.intended_use.trim() || formData.primary_uses.trim()),
      Boolean(formData.dataset.trim()),
      Boolean(formData.developed_by.trim() || formData.architecture.trim()),
      Boolean(Object.keys(formData.metrics).length && formData.metric_unit.trim() && formData.evaluation_reference.trim()),
      Boolean(formData.risks_and_harms.trim()),
      Boolean(formData.limitations.trim()),
      Boolean(declaredTests && formData.test_result && formData.test_executed_at && formData.test_reference.trim()),
      Boolean(formData.reproducibility.trim() && formData.reproducibility_seed.trim() && formData.source_revision.trim() && formData.environment_reference.trim()),
    ];
    return Math.round((evidenceGroups.filter(Boolean).length / evidenceGroups.length) * 100);
  };

  const handleFormSubmit = () => {
    const missingRequired = [
      !formData.model_name.trim() && { step: 1, label: 'Model name' },
      !formData.version.trim() && { step: 1, label: 'Version' },
      !(formData.intended_use.trim() || formData.primary_uses.trim()) && { step: 2, label: 'Primary intended uses' },
      !formData.dataset.trim() && { step: 5, label: 'Evaluation benchmark dataset' },
    ].filter(Boolean) as { step: number; label: string }[];
    if (missingRequired.length > 0) {
      setCurrentStep(missingRequired[0].step);
      setSubmissionHint(`To create a draft, complete: ${missingRequired.map((item) => item.label).join(', ')}.`);
      return;
    }
    setSubmissionHint('');
    const limitationsArr = formData.limitations.split('\n').map((s) => s.trim()).filter(Boolean);
    const risksArr = formData.risks_and_harms.split('\n').map((s) => s.trim()).filter(Boolean);
    const testsArr = [
      formData.disaggregated_results,
      formData.subgroup_benchmarks,
      formData.variation_approaches,
    ].filter((s) => Boolean(s && s.trim()));

    const evidence_items: NonNullable<ModelOpsInput['evidence_items']> = [
      ...Object.entries(formData.metrics).flatMap(([label, value]) => formData.metric_unit && formData.evaluation_reference ? [{ kind: 'metric' as const, label, value: String(value), provenance: 'submitted' as const, reference: formData.evaluation_reference, attributes: { unit: formData.metric_unit, evaluation_reference: formData.evaluation_reference, direction: 'neutral' as const } }] : []),
      ...risksArr.map((value) => ({ kind: 'risk' as const, label: 'Declared risk', value, provenance: 'submitted' as const })),
      ...limitationsArr.map((value) => ({ kind: 'limitation' as const, label: 'Declared limitation', value, provenance: 'submitted' as const })),
      ...(formData.mitigations.trim() ? [{ kind: 'mitigation' as const, label: 'Declared mitigation', value: formData.mitigations.trim(), provenance: 'submitted' as const }] : []),
      ...testsArr.flatMap((value) => formData.test_reference && formData.test_executed_at && formData.test_result ? [{ kind: 'test_run' as const, label: 'Executed test', value, provenance: 'submitted' as const, reference: formData.test_reference, attributes: { test_result: formData.test_result, executed_at: new Date(formData.test_executed_at).toISOString() } }] : []),
      ...(formData.reproducibility && formData.reproducibility_seed && formData.source_revision && formData.environment_reference ? [{ kind: 'reproducibility' as const, label: 'Reproducibility record', value: formData.reproducibility, provenance: 'submitted' as const, attributes: { seed: formData.reproducibility_seed, source_revision: formData.source_revision, environment_reference: formData.environment_reference } }] : []),
    ];
    const payload: ModelOpsInput = {
      model_name: formData.model_name.trim(), version: formData.version.trim(), dataset: formData.dataset.trim(), intended_use: formData.intended_use.trim() || formData.primary_uses.trim(),
      metrics: formData.metrics,
      // 9-section full wiring
      model_type: formData.model_type,
      architecture: formData.architecture,
      developed_by: formData.developed_by,
      release_date: formData.release_date,
      license: formData.license,
      primary_uses: formData.primary_uses,
      out_of_scope_uses: formData.out_of_scope_uses,
      target_users: formData.target_users,
      factors: formData.factors,
      environment: formData.environment,
      decision_thresholds: formData.decision_thresholds,
      variation_approaches: formData.variation_approaches,
      eval_preprocessing: formData.eval_preprocessing,
      data_split: formData.data_split,
      training_dataset: formData.training_dataset,
      data_volume: formData.data_volume,
      disaggregated_results: formData.disaggregated_results,
      subgroup_benchmarks: formData.subgroup_benchmarks,
      data_classification: formData.data_classification,
      uses_sensitive_data: formData.uses_sensitive_data,
      impacts_human_life: formData.impacts_human_life,
      risks_and_harms: formData.risks_and_harms,
      mitigations: formData.mitigations,
      recommendations: formData.recommendations,
      limitations: limitationsArr,
      risks: risksArr,
      tests: testsArr,
      reproducibility: formData.reproducibility,
      evidence_items,
    };
    onSubmit(payload);
  };

  const completionPercent = calculateCompletionPercent();

  return (
    <div className="space-y-6">
      {/* 1. Step Header & 9-Segment Progress Bar */}
      <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {SECTION_TITLES[currentStep - 1].title}
          </h2>
          <span className="text-xs font-semibold text-gray-500 font-mono">
            Section {currentStep} of 9
          </span>
        </div>

        {/* 9-Segment Colored Progress Bar matching VerifyWise */}
        <div className="grid grid-cols-9 gap-1.5 pt-1">
          {SECTION_TITLES.map((_, idx) => {
            const stepNum = idx + 1;
            let barColor = 'bg-gray-200';
            if (stepNum < currentStep) barColor = 'bg-[#13715B]'; // Completed
            else if (stepNum === currentStep) barColor = 'bg-amber-400'; // Current active

            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(stepNum)}
                className="group relative cursor-pointer"
                title={`Jump to ${SECTION_TITLES[idx].title}`}
              >
                <div className={`h-2.5 rounded-xs ${barColor} transition-colors group-hover:opacity-80`} />
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          {SECTION_TITLES[currentStep - 1].desc}
        </p>
      </div>

      {/* 2. Step Form Fields */}
      <div className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6">
        
        {/* ================= STEP 1: MODEL DETAILS ================= */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label htmlFor="model-name" className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Model name <span className="text-red-500">*</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <input
                id="model-name"
                type="text"
                value={formData.model_name}
                onChange={(e) => updateField('model_name', e.target.value)}
                placeholder="e.g., RoBERTa-Clinical-Triage"
                className={`w-full px-3.5 py-2 text-sm border rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B] ${
                  errors.model_name ? 'border-red-400 bg-red-50/20' : 'border-gray-300'
                }`}
              />
              {errors.model_name && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1 font-medium">
                  <AlertTriangle className="w-3 h-3" /> {errors.model_name}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="model-version" className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                  Version <span className="text-red-500">*</span>
                  <Info className="w-3 h-3 text-gray-400" />
                </label>
                <input
                  id="model-version"
                  type="text"
                  value={formData.version}
                  onChange={(e) => updateField('version', e.target.value)}
                  placeholder="e.g., 1.0.0"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                  Model type
                </label>
                <select
                  value={formData.model_type}
                  onChange={(e) => updateField('model_type', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
                >
                  <option value="Natural Language Processing">Natural Language Processing</option>
                  <option value="Computer Vision">Computer Vision</option>
                  <option value="Generative AI / LLM">Generative AI / LLM</option>
                  <option value="Recommendation System">Recommendation System</option>
                  <option value="Tabular Classification / Fraud">Tabular Classification / Fraud</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Architecture
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <input
                type="text"
                value={formData.architecture}
                onChange={(e) => updateField('architecture', e.target.value)}
                placeholder="e.g., Transformer, CNN, ResNet-50, XGBoost"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                  Developed by
                  <Info className="w-3 h-3 text-gray-400" />
                </label>
                <input
                  type="text"
                  value={formData.developed_by}
                  onChange={(e) => updateField('developed_by', e.target.value)}
                  placeholder="Organization or team name"
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                  Release date
                </label>
                <input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => updateField('release_date', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                License
              </label>
              <select
                value={formData.license}
                onChange={(e) => updateField('license', e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              >
                <option value="Apache-2.0">Apache-2.0</option>
                <option value="MIT">MIT</option>
                <option value="Proprietary Enterprise">Proprietary Enterprise</option>
                <option value="GPL-3.0">GPL-3.0</option>
                <option value="CC-BY-4.0">CC-BY-4.0</option>
              </select>
            </div>
          </div>
        )}

        {/* ================= STEP 2: INTENDED USE ================= */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label htmlFor="intended-use" className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Primary intended uses <span className="text-red-500">*</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                id="intended-use"
                rows={3}
                value={formData.intended_use}
                onChange={(e) => updateField('intended_use', e.target.value)}
                placeholder="Describe what the model was built to do and its primary application context..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Out-of-scope use cases
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={2}
                value={formData.out_of_scope_uses}
                onChange={(e) => updateField('out_of_scope_uses', e.target.value)}
                placeholder="Describe situations or domains where the model should NOT be used..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Target users
              </label>
              <input
                type="text"
                value={formData.target_users}
                onChange={(e) => updateField('target_users', e.target.value)}
                placeholder="e.g., Software engineers, compliance auditors, domain clinicians"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 3: FACTORS ================= */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Evaluation factors & demographics
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={3}
                value={formData.factors}
                onChange={(e) => updateField('factors', e.target.value)}
                placeholder="Describe demographic, geographic, or contextual factors relevant to performance..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Deployment environment & hardware
              </label>
              <textarea
                rows={2}
                value={formData.environment}
                onChange={(e) => updateField('environment', e.target.value)}
                placeholder="e.g., NVIDIA TensorRT runtime, INT8 quantization, Linux x86_64"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 4: METRICS ================= */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-2 flex items-center gap-1">
                Standard performance metric types
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-gray-50 border border-gray-200 rounded">
                {METRIC_CHECKBOXES.map((m) => {
                  const checked = formData.selectedMetricTypes.includes(m);
                  return (
                    <label key={m} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateField('selectedMetricTypes', [...formData.selectedMetricTypes, m]);
                          } else {
                            updateField(
                              'selectedMetricTypes',
                              formData.selectedMetricTypes.filter((x) => x !== m)
                            );
                          }
                        }}
                        className="rounded border-gray-300 text-[#13715B] focus:ring-[#13715B]"
                      />
                      <span>{m}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Quantitative Metrics Key-Value List */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-gray-800 flex items-center justify-between">
                <span>Quantitative metric values <span className="text-red-500">*</span></span>
                <span className="text-[11px] text-gray-500 font-normal">Directly affects readiness score</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.entries(formData.metrics).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded">
                    <span className="font-mono text-xs text-gray-700 font-semibold capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-900">{val}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMetric(key)}
                        className="text-gray-400 hover:text-red-600 p-0.5"
                        title="Remove Metric"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Metric Bar */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Metric name (e.g. auc_roc)"
                  value={metricKeyInput}
                  onChange={(e) => setMetricKeyInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded bg-white"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Value (e.g. 0.94)"
                  value={metricValInput}
                  onChange={(e) => setMetricValInput(e.target.value)}
                  className="w-full sm:w-28 px-3 py-1.5 text-xs border border-gray-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddCustomMetric}
                  className="px-3 py-1.5 bg-[#13715B] hover:bg-[#0f5c49] text-white text-xs font-semibold rounded flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Metric
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded">
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Metric unit <span className="text-amber-700">required for score</span></label>
                <input value={formData.metric_unit} onChange={(e) => updateField('metric_unit', e.target.value)} placeholder="e.g. proportion, ms" className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">Evaluation run / artifact reference <span className="text-amber-700">required for score</span></label>
                <input value={formData.evaluation_reference} onChange={(e) => updateField('evaluation_reference', e.target.value)} placeholder="e.g. mlflow://run/123 or internal run ID" className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" />
              </div>
              <p className="sm:col-span-2 text-[11px] text-amber-900">Numeric values without a unit and traceable evaluation reference are displayed as input metadata but receive no readiness points.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Decision thresholds
              </label>
              <textarea
                rows={2}
                value={formData.decision_thresholds}
                onChange={(e) => updateField('decision_thresholds', e.target.value)}
                placeholder="Describe how decision thresholds and cut-offs were chosen..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 5: EVALUATION DATA ================= */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label htmlFor="evaluation-dataset" className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Evaluation benchmark dataset <span className="text-red-500">*</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <input
                id="evaluation-dataset"
                type="text"
                value={formData.dataset}
                onChange={(e) => updateField('dataset', e.target.value)}
                placeholder="e.g., Clinical-NLP-Benchmark-v2"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Data preprocessing & filtering pipeline
              </label>
              <textarea
                rows={2}
                value={formData.eval_preprocessing}
                onChange={(e) => updateField('eval_preprocessing', e.target.value)}
                placeholder="Describe normalization, cleaning, tokenization, or noise filtering applied..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Train / Validation / Test data split
              </label>
              <input
                type="text"
                value={formData.data_split}
                onChange={(e) => updateField('data_split', e.target.value)}
                placeholder="e.g., 80% Train, 10% Validation, 10% Test"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 6: TRAINING DATA ================= */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Training dataset description & provenance
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={3}
                value={formData.training_dataset}
                onChange={(e) => updateField('training_dataset', e.target.value)}
                placeholder="Describe training datasets, sources, collection periods, and cleaning steps..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Training sample volume & scale
              </label>
              <input
                type="text"
                value={formData.data_volume}
                onChange={(e) => updateField('data_volume', e.target.value)}
                placeholder="e.g., 2.4M tokens / 150,000 paired annotations"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 7: QUANTITATIVE ANALYSES ================= */}
        {currentStep === 7 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Disaggregated evaluation findings
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={3}
                value={formData.disaggregated_results}
                onChange={(e) => updateField('disaggregated_results', e.target.value)}
                placeholder="Document performance across demographic slices, cohorts, or edge cases..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Subgroup benchmark disparities
              </label>
              <input
                type="text"
                value={formData.subgroup_benchmarks}
                onChange={(e) => updateField('subgroup_benchmarks', e.target.value)}
                placeholder="e.g., Disparity delta < 2.0% across verified groups"
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 8: ETHICAL CONSIDERATIONS ================= */}
        {currentStep === 8 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 border border-gray-200 rounded">
              <div>
                <span className="block text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1">
                  Uses sensitive or personal data?
                  <Info className="w-3 h-3 text-gray-400" />
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="sensitive_data"
                      checked={formData.uses_sensitive_data === true}
                      onChange={() => updateField('uses_sensitive_data', true)}
                      className="text-[#13715B] focus:ring-[#13715B]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="sensitive_data"
                      checked={formData.uses_sensitive_data === false}
                      onChange={() => updateField('uses_sensitive_data', false)}
                      className="text-[#13715B] focus:ring-[#13715B]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold text-gray-800 mb-1.5 flex items-center gap-1">
                  Impacts human life or critical services?
                  <Info className="w-3 h-3 text-gray-400" />
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="impacts_human"
                      checked={formData.impacts_human_life === true}
                      onChange={() => updateField('impacts_human_life', true)}
                      className="text-[#13715B] focus:ring-[#13715B]"
                    />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="impacts_human"
                      checked={formData.impacts_human_life === false}
                      onChange={() => updateField('impacts_human_life', false)}
                      className="text-[#13715B] focus:ring-[#13715B]"
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded border border-amber-200 bg-amber-50/50 p-3">
              <label htmlFor="data-classification" className="block text-xs font-semibold text-gray-800 mb-1">Data classification</label>
              <select id="data-classification" value={formData.data_classification} onChange={(event) => updateField('data_classification', event.target.value as WizardFormData['data_classification'])} className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                <option value="unclassified">Unclassified — external AI disabled</option>
                <option value="public">Public — may use external AI only when marked non-sensitive</option>
                <option value="internal">Internal — external AI disabled</option>
                <option value="confidential">Confidential — external AI disabled</option>
                <option value="restricted">Restricted — external AI disabled</option>
              </select>
              <p className="mt-2 text-[11px] text-amber-900">External AI suggestions are fail-closed: only explicitly public, non-sensitive evaluations may leave this workspace when the organization enables that feature.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Identified operational risks and potential harms <span className="text-red-500">*</span>
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={2}
                value={formData.risks_and_harms}
                onChange={(e) => updateField('risks_and_harms', e.target.value)}
                placeholder="Describe potential risks, safety hazards, and failure modes..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Mitigations and safety controls
              </label>
              <textarea
                rows={2}
                value={formData.mitigations}
                onChange={(e) => updateField('mitigations', e.target.value)}
                placeholder="Describe technical safeguards, guardrails, or human reviews in place..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* ================= STEP 9: CAVEATS & RECOMMENDATIONS ================= */}
        {currentStep === 9 && (
          <div className="space-y-4 animate-fadeIn">
            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Operational limitations & caveats
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <textarea
                rows={2}
                value={formData.limitations}
                onChange={(e) => updateField('limitations', e.target.value)}
                placeholder="List caveats or conditions under which model predictions degrade..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Reproducibility artifact & audit seed
                <Info className="w-3 h-3 text-gray-400" />
              </label>
              <input
                type="text"
                value={formData.reproducibility}
                onChange={(e) => updateField('reproducibility', e.target.value)}
                placeholder="e.g., Deterministic seed 42. sha256:7f83b1..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 font-mono focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded">
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Random seed</label><input value={formData.reproducibility_seed} onChange={(e) => updateField('reproducibility_seed', e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" /></div>
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Source revision</label><input value={formData.source_revision} onChange={(e) => updateField('source_revision', e.target.value)} placeholder="Git commit / immutable revision" className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" /></div>
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Environment reference</label><input value={formData.environment_reference} onChange={(e) => updateField('environment_reference', e.target.value)} placeholder="Lockfile / container digest" className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" /></div>
              <p className="sm:col-span-3 text-[11px] text-amber-900">All three fields are required before reproducibility can earn readiness points.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded">
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Test result</label><select value={formData.test_result} onChange={(e) => updateField('test_result', e.target.value as WizardFormData['test_result'])} className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white"><option value="">Select result</option><option value="passed">Passed</option><option value="failed">Failed</option><option value="inconclusive">Inconclusive</option></select></div>
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Test execution date</label><input type="datetime-local" value={formData.test_executed_at} onChange={(e) => updateField('test_executed_at', e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" /></div>
              <div><label className="block text-xs font-semibold text-gray-800 mb-1">Test report reference</label><input value={formData.test_reference} onChange={(e) => updateField('test_reference', e.target.value)} placeholder="Report / CI run URL or ID" className="w-full px-3 py-2 text-xs border border-gray-300 rounded bg-white" /></div>
              <p className="sm:col-span-3 text-[11px] text-amber-900">A declared test is not verification evidence until result, execution date, and report reference are supplied.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-800 mb-1 flex items-center gap-1">
                Recommendations for downstream deployment
              </label>
              <textarea
                rows={2}
                value={formData.recommendations}
                onChange={(e) => updateField('recommendations', e.target.value)}
                placeholder="Recommendations for integration, continuous monitoring, and retraining..."
                className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#13715B] focus:border-[#13715B]"
              />
            </div>
          </div>
        )}

        {/* 3. Wizard Step Navigation Footer matching VerifyWise */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            )}

            {onStartOver && (
              <button
                type="button"
                onClick={onStartOver}
                className="text-xs text-gray-500 hover:text-gray-900 underline underline-offset-4 cursor-pointer"
              >
                Start over
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Quick Generate Action Button Available on Any Step */}
            <button
              type="button"
              disabled={isLoading}
              onClick={handleFormSubmit}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Generate Model Card immediately using current metadata"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{isLoading ? 'Running Pipeline...' : 'Generate Model Card'}</span>
            </button>

            {currentStep < 9 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.min(9, prev + 1))}
                className="px-4 py-2 bg-[#13715B] hover:bg-[#0f5c49] text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {submissionHint && <p role="alert" className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">{submissionHint}</p>}
      </div>

      {/* 4. Overall Completion Progress Card */}
      <div className="bg-white border border-gray-300 rounded-md p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-gray-700">
          <FileCheck className="w-4 h-4 text-[#13715B]" />
          <span className="font-semibold">Evidence-backed dossier completion:</span>
          <span className="font-mono font-bold text-gray-900">{completionPercent}%</span>
        </div>
        <div className="w-full sm:w-48 h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div
            className="h-full bg-[#13715B] rounded-full transition-all duration-500"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
