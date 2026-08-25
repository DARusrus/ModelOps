'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { CompareRunsOutput } from '@/types';
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  X,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Upload,
  FileCode,
  Layers,
  Sparkles,
} from 'lucide-react';

interface RunComparisonProps {
  runA?: ModelCardOutput;
  runB?: ModelCardOutput | null;
  run1?: ModelCardOutput;
  run2?: ModelCardOutput | null;
  templateId?: string | null;
  sessionHistory?: ModelCardOutput[];
  onClose?: () => void;
}

const HISTORICAL_BASELINES: Record<string, ModelCardOutput> = {
  resnet_v09: {
    model_name: 'ResNet50-Baseline',
    version: '0.9.0',
    dataset: 'ImageNet-1k-Val',
    metrics: {
      accuracy: 0.912,
      f1_score: 0.905,
      latency_ms: 18.5,
      top_5_accuracy: 0.962,
    },
    intended_use: 'Legacy visual inspection baseline run.',
    limitations: ['Degrades under low illumination.', 'Memory footprint exceeded 500MB on edge device.'],
    risks: ['High false negative rate on reflective metallic parts.'],
    tests: ['Unit tests passed.', 'Basic latency benchmark passed.'],
    reproducibility: 'Legacy seed 123 run_7741',
    readiness_score: 72,
    decision: 'pending_human_review',
  },
  clinical_bert_v1: {
    model_name: 'Clinical-BERT-Triage',
    version: '1.0.0',
    dataset: 'MIMIC-IV-Deidentified-Notes',
    metrics: {
      accuracy: 0.885,
      f1_score: 0.871,
      latency_ms: 28.0,
    },
    intended_use: 'Clinical discharge note classification.',
    limitations: ['English transcripts only.'],
    risks: ['Diagnostic false negatives on rare symptoms.'],
    tests: ['5-Fold Cross Validation'],
    reproducibility: 'PyTorch seed 42',
    readiness_score: 75,
    decision: 'pending_human_review',
  },
  llama_gov_v1: {
    model_name: 'LLaMA-3-Governance',
    version: '1.2.0',
    dataset: 'Enterprise-Policy-Corpus-v2',
    metrics: {
      accuracy: 0.864,
      f1_score: 0.852,
      latency_ms: 125.0,
    },
    intended_use: 'Automated compliance rule triage.',
    limitations: ['Requires human supervisor verification.'],
    risks: ['Prompt injection vulnerability.'],
    tests: ['Red-teaming evaluation suite'],
    reproducibility: 'HuggingFace Hub sha256:4f8e...',
    readiness_score: 78,
    decision: 'pending_human_review',
  },
  xgboost_fraud_v1: {
    model_name: 'XGBoost-Fraud-Engine',
    version: '1.0.0',
    dataset: 'CreditCard-Transactions-2025',
    metrics: {
      accuracy: 0.942,
      f1_score: 0.926,
      latency_ms: 5.2,
    },
    intended_use: 'Real-time financial transaction fraud anomaly detection.',
    limitations: ['Requires sub-10ms inference window.'],
    risks: ['False declines on international holiday purchases.'],
    tests: ['SMOTE Cross Validation', 'Latency SLA Test'],
    reproducibility: 'Random seed 42, XGBoost 1.7.6',
    readiness_score: 74,
    decision: 'pending_human_review',
  },
  recsys_two_tower_v1: {
    model_name: 'Two-Tower-Neural-Recs',
    version: '0.9.0',
    dataset: 'User-Item-Interaction-Logs',
    metrics: {
      ndcg: 0.81,
      map: 0.75,
      latency_ms: 38.0,
    },
    intended_use: 'E-commerce product ranking and candidate generation.',
    limitations: ['Cold-start user sparsity.'],
    risks: ['Popularity bias amplification.'],
    tests: ['Offline NDCG@10 Benchmark'],
    reproducibility: 'TensorFlow Recommenders seed 101',
    readiness_score: 68,
    decision: 'pending_human_review',
  },
};

export default function RunComparison({
  runA,
  runB: initialRunB,
  run1,
  run2,
  templateId,
  sessionHistory = [],
  onClose,
}: RunComparisonProps) {
  const activeRunA = runA || run2 || HISTORICAL_BASELINES.resnet_v09;

  // Auto-determine baseline by template
  const defaultBaselineKey =
    templateId === 'computer-vision'
      ? 'resnet_v09'
      : templateId === 'nlp-classification'
      ? 'clinical_bert_v1'
      : templateId === 'tabular-classification'
      ? 'xgboost_fraud_v1'
      : templateId === 'recommender-system'
      ? 'recsys_two_tower_v1'
      : 'llama_gov_v1';

  const [selectedBaselineKey, setSelectedBaselineKey] = useState<string>(defaultBaselineKey);
  const [customUploadedBaseline, setCustomUploadedBaseline] = useState<ModelCardOutput | null>(null);
  const [activeRunB, setActiveRunB] = useState<ModelCardOutput>(
    initialRunB || run1 || HISTORICAL_BASELINES[defaultBaselineKey]
  );
  const [serverComparison, setServerComparison] = useState<CompareRunsOutput | null>(null);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync baseline whenever template changes
  useEffect(() => {
    if (templateId) {
      const matchedKey =
        templateId === 'computer-vision'
          ? 'resnet_v09'
          : templateId === 'nlp-classification'
          ? 'clinical_bert_v1'
          : templateId === 'tabular-classification'
          ? 'xgboost_fraud_v1'
          : templateId === 'recommender-system'
          ? 'recsys_two_tower_v1'
          : 'llama_gov_v1';
      setSelectedBaselineKey(matchedKey);
    }
  }, [templateId]);

  // When baseline selector or uploaded file changes, fetch server comparison
  useEffect(() => {
    let baseline: ModelCardOutput;

    if (selectedBaselineKey === 'custom_uploaded' && customUploadedBaseline) {
      baseline = customUploadedBaseline;
    } else if (selectedBaselineKey.startsWith('session_')) {
      const sessionIndex = parseInt(selectedBaselineKey.replace('session_', ''), 10);
      baseline = sessionHistory[sessionIndex] || HISTORICAL_BASELINES[defaultBaselineKey];
    } else {
      baseline = HISTORICAL_BASELINES[selectedBaselineKey] || HISTORICAL_BASELINES[defaultBaselineKey];
    }

    setActiveRunB(baseline);

    // Call POST /api/modelops/compare
    const fetchApiCompare = async () => {
      setIsLoadingApi(true);
      try {
        const res = await fetch('/api/modelops/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            run1: baseline,
            run2: activeRunA,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.comparison) {
            setServerComparison(data.comparison);
          }
        }
      } catch (err) {
        // Fallback to client-side diff
      } finally {
        setIsLoadingApi(false);
      }
    };

    fetchApiCompare();
  }, [selectedBaselineKey, customUploadedBaseline, activeRunA, defaultBaselineKey, sessionHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.model_name && parsed.metrics) {
          setCustomUploadedBaseline(parsed);
          setSelectedBaselineKey('custom_uploaded');
        } else {
          alert('Uploaded file does not appear to be a valid ModelCard JSON.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const allMetricKeys = Array.from(
    new Set([...Object.keys(activeRunA.metrics || {}), ...Object.keys(activeRunB.metrics || {})])
  );

  const calculateDelta = (key: string) => {
    const valA = activeRunA.metrics?.[key] ?? 0;
    const valB = activeRunB.metrics?.[key] ?? 0;
    const delta = valA - valB;

    const isLatency =
      key.toLowerCase().includes('latency') ||
      key.toLowerCase().includes('time') ||
      key.toLowerCase().includes('error');
    let isPositive = delta > 0;
    if (isLatency) isPositive = delta < 0;

    return {
      valA,
      valB,
      delta,
      isPositive,
    };
  };

  const readinessDelta = (activeRunA.readiness_score || 0) - (activeRunB.readiness_score || 0);

  return (
    <section
      id="compare"
      aria-label="Experiment Run Side-by-Side Comparison"
      className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn scroll-mt-20"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Authoritative Run Diff
            </span>
            <span className="text-xs text-gray-500 font-mono">POST /api/modelops/compare</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#13715B]" />
            Model Comparison: Candidate Run vs Baseline
          </h3>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Comparison View"
            className="self-start sm:self-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Close Diff
          </button>
        )}
      </div>

      {/* Dynamic Baseline Selector & Custom Upload Toolbar */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
          <label htmlFor="baseline-select" className="font-semibold text-gray-800 shrink-0 font-mono">
            Baseline Run Source:
          </label>
          <select
            id="baseline-select"
            value={selectedBaselineKey}
            onChange={(e) => setSelectedBaselineKey(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-[#13715B] cursor-pointer"
          >
            <optgroup label="Template Domain Baselines">
              <option value="llama_gov_v1">LLaMA-3-Governance (v1.2.0) — Score: 78/100</option>
              <option value="resnet_v09">ResNet50-Baseline (v0.9.0) — Score: 72/100</option>
              <option value="clinical_bert_v1">Clinical-BERT-Triage (v1.0.0) — Score: 75/100</option>
              <option value="xgboost_fraud_v1">XGBoost-Fraud-Engine (v1.0.0) — Score: 74/100</option>
              <option value="recsys_two_tower_v1">Two-Tower-Neural-Recs (v0.9.0) — Score: 68/100</option>
            </optgroup>

            {sessionHistory.length > 0 && (
              <optgroup label="Current Session Runs">
                {sessionHistory.map((sCard, idx) => (
                  <option key={idx} value={`session_${idx}`}>
                    Previous Run: {sCard.model_name} (v{sCard.version}) — {sCard.readiness_score} pts
                  </option>
                ))}
              </optgroup>
            )}

            {customUploadedBaseline && (
              <optgroup label="Uploaded Custom Baseline">
                <option value="custom_uploaded">
                  Uploaded: {customUploadedBaseline.model_name} (v{customUploadedBaseline.version}) —{' '}
                  {customUploadedBaseline.readiness_score} pts
                </option>
              </optgroup>
            )}
          </select>
        </div>

        {/* Upload Custom JSON Button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 font-semibold rounded flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#13715B]" />
            <span>Upload Baseline JSON</span>
          </button>
        </div>
      </div>

      {/* Readiness Score Delta Banner */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
              readinessDelta >= 0
                ? 'bg-emerald-50 text-[#13715B] border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {readinessDelta >= 0 ? `+${readinessDelta}` : readinessDelta}
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium font-mono">Readiness Index Shift</div>
            <div className="text-sm font-bold text-gray-900">
              {activeRunB.model_name} ({activeRunB.readiness_score} pts) &rarr; {activeRunA.model_name} ({activeRunA.readiness_score} pts)
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-xs font-bold font-mono border ${
              readinessDelta >= 0
                ? 'bg-emerald-50 text-[#13715B] border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            {readinessDelta >= 0 ? '▲ Score Improved' : '▼ Score Regressed'}
          </span>
        </div>
      </div>

      {/* Server Summary Bullet List */}
      {serverComparison?.summary && serverComparison.summary.length > 0 && (
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded text-xs text-gray-800 space-y-1">
          <span className="font-bold text-gray-900 block mb-1">Automated Governance Summary:</span>
          {serverComparison.summary.map((line, idx) => (
            <p key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#13715B] shrink-0" />
              <span>{line}</span>
            </p>
          ))}
        </div>
      )}

      {/* Side-by-Side Model Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Baseline Run Card */}
        <div className="p-4 bg-gray-50/70 border border-gray-200 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono">
              Baseline Release (Run 1)
            </span>
            <span className="font-mono text-xs font-bold text-gray-600 bg-white px-2 py-0.5 border border-gray-200 rounded">
              v{activeRunB.version}
            </span>
          </div>
          <div className="text-base font-bold text-gray-900">{activeRunB.model_name}</div>
          <p className="text-xs text-gray-600 line-clamp-2">{activeRunB.intended_use}</p>
        </div>

        {/* Candidate Run Card */}
        <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#13715B] uppercase tracking-wider font-mono">
              Candidate Release (Run 2)
            </span>
            <span className="font-mono text-xs font-bold text-[#13715B] bg-white px-2 py-0.5 border border-emerald-300 rounded">
              v{activeRunA.version}
            </span>
          </div>
          <div className="text-base font-bold text-gray-900">{activeRunA.model_name}</div>
          <p className="text-xs text-gray-600 line-clamp-2">{activeRunA.intended_use}</p>
        </div>
      </div>

      {/* Quantitative Metric Delta Matrix Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
            Quantitative Metric Shifts
          </h4>
          <span className="text-[11px] text-gray-500 font-mono">
            {allMetricKeys.length} metrics evaluated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-700 font-semibold">
                <th className="p-3">Metric Name</th>
                <th className="p-3 text-right">Baseline ({activeRunB.model_name})</th>
                <th className="p-3 text-right">Candidate ({activeRunA.model_name})</th>
                <th className="p-3 text-right">Delta Shift</th>
                <th className="p-3 text-center">Trend Indicator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allMetricKeys.map((key) => {
                const { valA, valB, delta, isPositive } = calculateDelta(key);
                const isZero = delta === 0;

                return (
                  <tr key={key} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3 font-mono font-medium text-gray-900 capitalize">
                      {key.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-600">
                      {typeof valB === 'number' ? valB : '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-gray-900">
                      {typeof valA === 'number' ? valA : '-'}
                    </td>
                    <td
                      className={`p-3 text-right font-mono font-bold ${
                        isZero
                          ? 'text-gray-500'
                          : isPositive
                          ? 'text-[#13715B]'
                          : 'text-rose-600'
                      }`}
                    >
                      {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isZero
                            ? 'bg-gray-100 text-gray-600 border-gray-200'
                            : isPositive
                            ? 'bg-emerald-50 text-[#13715B] border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {isZero ? (
                          'Unchanged'
                        ) : isPositive ? (
                          <>
                            <TrendingUp className="w-3 h-3" /> Improvement
                          </>
                        ) : (
                          <>
                            <TrendingDown className="w-3 h-3" /> Regression
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
