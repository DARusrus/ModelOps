import React, { useState, useEffect } from 'react';
import { ModelOpsInput, FormValidationErrors, MetricKeyValuePair } from '@/types/modelops';
import { Plus, Trash2, Send, AlertCircle } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: ModelOpsInput) => void;
  isLoading?: boolean;
  // External errors (e.g. from a backend 4xx validation response, or from
  // the dev state-machine debugger). Merged with the form's own client-side
  // validation errors and rendered inline under the matching field.
  errors?: FormValidationErrors;
}

export const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading = false, errors: externalErrors }) => {
  const [modelName, setModelName] = useState('ResNet50-Classifier');
  const [version, setVersion] = useState('v1.2.0');
  const [dataset, setDataset] = useState('ImageNet-1K-Val');
  const [intendedUse, setIntendedUse] = useState(
    'Real-time automated medical image triage for standard X-ray scans.'
  );

  const [metrics, setMetrics] = useState<MetricKeyValuePair[]>([
    { id: '1', key: 'accuracy', value: '0.945' },
    { id: '2', key: 'f1_score', value: '0.928' },
    { id: '3', key: 'latency_ms', value: '14.2' },
  ]);

  const [errors, setErrors] = useState<FormValidationErrors>({});

  // Whenever the parent hands us new external errors (e.g. the "Valid-Err"
  // debugger button, or a real 4xx response from /api/modelops), merge them
  // into the same error state that client-side validate() writes to, so
  // every error — regardless of source — renders through the same inline
  // per-field UI below. External errors take precedence since they reflect
  // the latest known-bad submission.
  useEffect(() => {
    if (externalErrors && Object.keys(externalErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...externalErrors }));
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
    // Clear a field's error as soon as the user starts fixing it.
    if (field === 'key' || field === 'value') {
      setErrors((prev) => {
        if (!prev.metrics) return prev;
        const next = { ...prev };
        delete next.metrics;
        return next;
      });
    }
  };

  const clearFieldError = (field: keyof FormValidationErrors) => {
    setErrors((prev) => {
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
    const parsedMetrics: Record<string, number> = {};
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
        parsedMetrics[k] = v;
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
    });
  };

  // A generic, field-less error (e.g. backend returned { _form: "..." }
  // instead of a per-field breakdown) renders as a small banner above the
  // submit button rather than being silently dropped.
  const formLevelError = errors._form;

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-slate-100"
      noValidate
    >
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
          Model Evaluation Specification
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Submit model parameters and target evaluation metrics for automated readiness scoring.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model Name */}
        <div>
          <label htmlFor="model_name" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Model Identifier <span className="text-red-400">*</span>
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
            className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${errors.model_name ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-blue-500'
              } text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
            placeholder="e.g. ResNet50-Classifier"
          />
          {errors.model_name && (
            <p id="model_name_error" role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.model_name}
            </p>
          )}
        </div>

        {/* Version */}
        <div>
          <label htmlFor="version" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
            Version Tag <span className="text-red-400">*</span>
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
            className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${errors.version ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-blue-500'
              } text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
            placeholder="e.g. v1.2.0"
          />
          {errors.version && (
            <p id="version_error" role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.version}
            </p>
          )}
        </div>
      </div>

      {/* Dataset */}
      <div>
        <label htmlFor="dataset" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Evaluation Dataset <span className="text-red-400">*</span>
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
          className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${errors.dataset ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-blue-500'
            } text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
          placeholder="e.g. ImageNet-1K-Validation"
        />
        {errors.dataset && (
          <p id="dataset_error" role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.dataset}
          </p>
        )}
      </div>

      {/* Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Performance Metrics (Key / Numeric Value) <span className="text-red-400">*</span>
          </label>
          <button
            type="button"
            onClick={addMetricRow}
            disabled={isLoading}
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 focus:outline-none focus:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Metric
          </button>
        </div>

        <div className="space-y-3">
          {metrics.map((m, index) => (
            <div key={m.id} className="flex items-center gap-3">
              <div className="flex-1">
                <label htmlFor={`metric_key_${m.id}`} className="sr-only">
                  Metric Name {index + 1}
                </label>
                <input
                  id={`metric_key_${m.id}`}
                  type="text"
                  placeholder="Metric name (e.g. accuracy)"
                  value={m.key}
                  onChange={(e) => updateMetricRow(m.id, 'key', e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label htmlFor={`metric_val_${m.id}`} className="sr-only">
                  Metric Value {index + 1}
                </label>
                <input
                  id={`metric_val_${m.id}`}
                  type="number"
                  step="any"
                  placeholder="Numeric value (e.g. 0.945)"
                  value={m.value}
                  onChange={(e) => updateMetricRow(m.id, 'value', e.target.value)}
                  disabled={isLoading}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={() => removeMetricRow(m.id)}
                disabled={isLoading || metrics.length <= 1}
                aria-label={`Remove metric row ${index + 1}`}
                className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:text-slate-500 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        {errors.metrics && (
          <p id="metrics_error" role="alert" className="mt-2 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.metrics}
          </p>
        )}
      </div>

      {/* Intended Use */}
      <div>
        <label htmlFor="intended_use" className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Intended Use & Domain Scope <span className="text-red-400">*</span>
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
          className={`w-full px-4 py-2.5 rounded-lg bg-slate-950 border ${errors.intended_use ? 'border-red-500 focus:ring-red-500' : 'border-slate-800 focus:border-blue-500'
            } text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all`}
          placeholder="Describe intended operating environment, target users, and task domain..."
        />
        {errors.intended_use && (
          <p id="intended_use_error" role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {errors.intended_use}
          </p>
        )}
      </div>

      {/* Form-level error banner (only for errors not tied to a specific field) */}
      {formLevelError && (
        <div role="alert" className="p-3 rounded-lg bg-red-950/40 border border-red-800/50 text-xs text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {formLevelError}
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-blue-900/30 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          {isLoading ? 'Processing Evaluation...' : 'Submit Experiment for Evaluation'}
        </button>
      </div>
    </form>
  );
};

export default InputForm;
