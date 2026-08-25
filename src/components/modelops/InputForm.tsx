import React, { useState, useEffect } from 'react';
import { ModelOpsInput, FormValidationErrors, MetricKeyValuePair } from '@/types/modelops';
import { Plus, Trash2, Send, AlertCircle, Sliders, ChevronDown, ChevronUp } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: ModelOpsInput) => void;
  isLoading?: boolean;
  errors?: FormValidationErrors;
  initialData?: ModelOpsInput | null;
}

export const InputForm: React.FC<InputFormProps> = ({
  onSubmit,
  isLoading = false,
  errors: externalErrors,
  initialData,
}) => {
  const [modelName, setModelName] = useState('ResNet50-Classifier');
  const [version, setVersion] = useState('v1.2.0');
  const [dataset, setDataset] = useState('ImageNet-1K-Val');
  const [intendedUse, setIntendedUse] = useState(
    'Real-time automated medical image triage for standard X-ray scans.'
  );
  const [limitations, setLimitations] = useState<string>('');
  const [risks, setRisks] = useState<string>('');
  const [tests, setTests] = useState<string>('');
  const [reproducibility, setReproducibility] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const [metrics, setMetrics] = useState<MetricKeyValuePair[]>([
    { id: '1', key: 'accuracy', value: '0.945' },
    { id: '2', key: 'f1_score', value: '0.928' },
    { id: '3', key: 'latency_ms', value: '14.2' },
  ]);

  const [errors, setErrors] = useState<FormValidationErrors>({});

  // Sync state whenever initialData changes (e.g. user selected a template)
  useEffect(() => {
    if (initialData) {
      setModelName(initialData.model_name || '');
      setVersion(initialData.version || 'v1.0.0');
      setDataset(initialData.dataset || '');
      setIntendedUse(initialData.intended_use || '');
      setLimitations(
        Array.isArray(initialData.limitations)
          ? initialData.limitations.join('; ')
          : (initialData.limitations as string) || ''
      );
      setRisks(
        Array.isArray(initialData.risks)
          ? initialData.risks.join('; ')
          : (initialData.risks as string) || ''
      );
      setTests(
        Array.isArray(initialData.tests)
          ? initialData.tests.join('; ')
          : (initialData.tests as string) || ''
      );
      setReproducibility(initialData.reproducibility || '');

      if (initialData.metrics && Object.keys(initialData.metrics).length > 0) {
        setMetrics(
          Object.entries(initialData.metrics).map(([k, v], idx) => ({
            id: String(idx + 1),
            key: k,
            value: String(v),
          }))
        );
      }
      setErrors({});
    }
  }, [initialData]);

  // Merge external errors
  useEffect(() => {
    if (externalErrors && Object.keys(externalErrors).length > 0) {
      setErrors((prev: FormValidationErrors) => ({ ...prev, ...externalErrors }));
    }
  }, [externalErrors]);

  const addMetricRow = () => {
    setMetrics([
      ...metrics,
      { id: Date.now().toString(), key: '', value: '' },
    ]);
  };

  const removeMetricRow = (id: string) => {
    if (metrics.length <= 1) return;
    setMetrics(metrics.filter((m) => m.id !== id));
  };

  const updateMetricRow = (id: string, field: 'key' | 'value', val: string) => {
    setMetrics(
      metrics.map((m) => (m.id === id ? { ...m, [field]: val } : m))
    );
    if (field === 'key' || field === 'value') {
      setErrors((prev: FormValidationErrors) => {
        if (!prev.metrics) return prev;
        const next = { ...prev };
        delete next.metrics;
        return next;
      });
    }
  };

  const clearFieldError = (field: string) => {
    setErrors((prev: FormValidationErrors) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validate = (): boolean => {
    const newErrors: FormValidationErrors = {};

    if (!modelName.trim()) {
      newErrors.model_name = 'Model name is required.';
    } else if (modelName.trim().length < 2) {
      newErrors.model_name = 'Model name must be at least 2 characters.';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(modelName.trim())) {
      newErrors.model_name = 'Model identifier must be alphanumeric (letters, numbers, - or _ only).';
    }

    if (!version.trim()) {
      newErrors.version = 'Version tag is required (e.g. v1.0.0).';
    }

    if (!dataset.trim()) {
      newErrors.dataset = 'Evaluation dataset name is required.';
    }

    if (!intendedUse.trim()) {
      newErrors.intended_use = 'Intended use description is required.';
    } else if (intendedUse.trim().length < 10) {
      newErrors.intended_use = 'Intended use must be at least 10 characters detailing deployment context.';
    }

    // Validate metrics key/value
    let metricsValid = true;
    if (metrics.length === 0) {
      newErrors.metrics = 'At least one performance metric is required.';
      metricsValid = false;
    } else {
      for (const m of metrics) {
        const k = m.key.trim();
        const v = parseFloat(m.value);
        if (!k || isNaN(v)) {
          metricsValid = false;
          break;
        }
      }
      if (!metricsValid) {
        newErrors.metrics = 'All metrics must have non-empty names and valid numerical values.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedMetrics: Record<string, number> = {};
    metrics.forEach((m) => {
      if (m.key.trim() && !isNaN(parseFloat(m.value))) {
        formattedMetrics[m.key.trim()] = parseFloat(m.value);
      }
    });

    onSubmit({
      model_name: modelName.trim(),
      version: version.trim(),
      dataset: dataset.trim(),
      intended_use: intendedUse.trim(),
      metrics: formattedMetrics,
      limitations: limitations.trim() ? limitations.split(';').map((s) => s.trim()) : undefined,
      risks: risks.trim() ? risks.split(';').map((s) => s.trim()) : undefined,
      tests: tests.trim() ? tests.split(';').map((s) => s.trim()) : undefined,
      reproducibility: reproducibility.trim() || undefined,
    });
  };

  const formLevelError = errors._form;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 bg-white border border-gray-300 rounded-md shadow-xs space-y-6 text-gray-900"
      noValidate
    >
      <div className="border-b border-gray-200 pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#13715B]" />
            Model Specification & Input Parameters
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Provide model attributes, test dataset, and quantitative validation metrics.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          Required Fields *
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Model Name */}
        <div>
          <label htmlFor="model_name" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Model Identifier <span className="text-red-500">*</span>
          </label>
          <input
            id="model_name"
            type="text"
            value={modelName}
            onChange={(e) => {
              setModelName(e.target.value);
              clearFieldError('model_name');
            }}
            disabled={isLoading}
            aria-describedby={errors.model_name ? 'model_name_error' : undefined}
            aria-invalid={!!errors.model_name}
            className={`w-full px-3.5 py-2 rounded border ${
              errors.model_name
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]'
            } bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition-colors`}
            placeholder="e.g. ResNet50-Classifier"
          />
          {errors.model_name && (
            <p id="model_name_error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.model_name}
            </p>
          )}
        </div>

        {/* Version */}
        <div>
          <label htmlFor="version" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
            Version Tag <span className="text-red-500">*</span>
          </label>
          <input
            id="version"
            type="text"
            value={version}
            onChange={(e) => {
              setVersion(e.target.value);
              clearFieldError('version');
            }}
            disabled={isLoading}
            aria-describedby={errors.version ? 'version_error' : undefined}
            aria-invalid={!!errors.version}
            className={`w-full px-3.5 py-2 rounded border ${
              errors.version
                ? 'border-red-500 focus:ring-red-400'
                : 'border-gray-300 focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]'
            } bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition-colors`}
            placeholder="e.g. v1.2.0"
          />
          {errors.version && (
            <p id="version_error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.version}
            </p>
          )}
        </div>
      </div>

      {/* Dataset */}
      <div>
        <label htmlFor="dataset" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
          Evaluation Dataset <span className="text-red-500">*</span>
        </label>
        <input
          id="dataset"
          type="text"
          value={dataset}
          onChange={(e) => {
            setDataset(e.target.value);
            clearFieldError('dataset');
          }}
          disabled={isLoading}
          aria-describedby={errors.dataset ? 'dataset_error' : undefined}
          aria-invalid={!!errors.dataset}
          className={`w-full px-3.5 py-2 rounded border ${
            errors.dataset
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]'
          } bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition-colors`}
          placeholder="e.g. ImageNet-1K-Validation"
        />
        {errors.dataset && (
          <p id="dataset_error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.dataset}
          </p>
        )}
      </div>

      {/* Metrics Section */}
      <div className="bg-gray-50/70 border border-gray-200 rounded p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-800">
            Performance Metrics (Key / Float Value) <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addMetricRow}
            disabled={isLoading}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#13715B] hover:text-[#0f5c49] focus:outline-none cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Metric
          </button>
        </div>

        <div className="space-y-2.5">
          {metrics.map((m, index) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <div className="flex-1">
                <input
                  id={`metric_key_${m.id}`}
                  type="text"
                  placeholder="Metric name (e.g. accuracy)"
                  value={m.key}
                  onChange={(e) => updateMetricRow(m.id, 'key', e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]"
                />
              </div>
              <div className="flex-1">
                <input
                  id={`metric_val_${m.id}`}
                  type="number"
                  step="any"
                  placeholder="Numerical value (e.g. 0.945)"
                  value={m.value}
                  onChange={(e) => updateMetricRow(m.id, 'value', e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 bg-white text-gray-900 text-sm focus:outline-none focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMetricRow(m.id)}
                disabled={isLoading || metrics.length <= 1}
                aria-label={`Remove metric row ${index + 1}`}
                className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-30 rounded hover:bg-gray-100 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {errors.metrics && (
          <p id="metrics_error" role="alert" className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.metrics}
          </p>
        )}
      </div>

      {/* Intended Use */}
      <div>
        <label htmlFor="intended_use" className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1.5">
          Intended Use & Deployment Scope <span className="text-red-500">*</span>
        </label>
        <textarea
          id="intended_use"
          rows={3}
          value={intendedUse}
          onChange={(e) => {
            setIntendedUse(e.target.value);
            clearFieldError('intended_use');
          }}
          disabled={isLoading}
          aria-describedby={errors.intended_use ? 'intended_use_error' : undefined}
          aria-invalid={!!errors.intended_use}
          className={`w-full px-3.5 py-2 rounded border ${
            errors.intended_use
              ? 'border-red-500 focus:ring-red-400'
              : 'border-gray-300 focus:border-[#13715B] focus:ring-1 focus:ring-[#13715B]'
          } bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none transition-colors`}
          placeholder="Describe intended domain, target users, and expected deployment setting..."
        />
        {errors.intended_use && (
          <p id="intended_use_error" role="alert" className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.intended_use}
          </p>
        )}
      </div>

      {/* Advanced Governance Parameters (Collapsible) */}
      <div className="border border-gray-200 rounded">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-4 py-2.5 bg-gray-50 flex items-center justify-between text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#13715B]" />
            Optional Domain Context (Limitations, Risks & Reproducibility)
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="p-4 space-y-4 bg-white">
            <div>
              <label htmlFor="limitations" className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Known Limitations (Separate with semicolons)
              </label>
              <input
                id="limitations"
                type="text"
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#13715B]"
                placeholder="e.g. Degrades under high sensor noise; Higher error rate on edge-cases"
              />
            </div>
            <div>
              <label htmlFor="risks" className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                Identified Risk Factors
              </label>
              <input
                id="risks"
                type="text"
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#13715B]"
                placeholder="e.g. Out-of-distribution demographic drift; Sensor variance"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tests" className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Validation Tests Passed
                </label>
                <input
                  id="tests"
                  type="text"
                  value={tests}
                  onChange={(e) => setTests(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#13715B]"
                  placeholder="e.g. 5-Fold Stratified CV; Latency SLA < 20ms"
                />
              </div>
              <div>
                <label htmlFor="reproducibility" className="block text-[11px] font-semibold uppercase text-gray-600 mb-1">
                  Reproducibility & Seed
                </label>
                <input
                  id="reproducibility"
                  type="text"
                  value={reproducibility}
                  onChange={(e) => setReproducibility(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-1.5 rounded border border-gray-300 text-sm focus:outline-none focus:border-[#13715B]"
                  placeholder="e.g. Deterministic PyTorch seed 42, sha256:1a2b3c..."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Form-level error banner */}
      {formLevelError && (
        <div role="alert" className="p-3 rounded bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {formLevelError}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded bg-[#13715B] hover:bg-[#0f5c49] active:bg-[#0c493a] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-[#13715B] focus:ring-offset-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {isLoading ? 'Synthesizing Model Card & Computing Score...' : 'Generate Model Card & Readiness Score'}
        </button>
      </div>
    </form>
  );
};

export default InputForm;
