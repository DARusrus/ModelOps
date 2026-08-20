'use client';

import React, { useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';

interface RunComparisonProps {
  runA?: ModelCardOutput;
  runB?: ModelCardOutput | null;
  run1?: ModelCardOutput;
  run2?: ModelCardOutput | null;
  onClose?: () => void;
}

// Preset baseline model card for instant side-by-side comparison
const DEFAULT_BASELINE_RUN: ModelCardOutput = {
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
  limitations: [
    'Degrades under low illumination.',
    'Memory footprint exceeded 500MB on edge device.',
  ],
  risks: [
    'High false negative rate on reflective metallic parts.',
  ],
  tests: [
    'Unit tests passed.',
    'Basic latency benchmark passed.',
  ],
  reproducibility: 'Legacy seed 123 run_7741',
  readiness_score: 72,
  decision: 'NEEDS_GOVERNANCE_REVIEW',
};

export default function RunComparison({ runA, runB: initialRunB, run1, run2, onClose }: RunComparisonProps) {
  const activeRunA = runA || run2 || DEFAULT_BASELINE_RUN;
  const [activeRunB] = useState<ModelCardOutput>(initialRunB || run1 || DEFAULT_BASELINE_RUN);

  // Compute metric differences
  const allMetricKeys = Array.from(
    new Set([...Object.keys(activeRunA.metrics || {}), ...Object.keys(activeRunB.metrics || {})])
  );

  const calculateDelta = (key: string) => {
    const valA = activeRunA.metrics?.[key] ?? 0;
    const valB = activeRunB.metrics?.[key] ?? 0;
    const delta = valA - valB;

    // For latency, lower is better. For accuracy/f1, higher is better.
    const isLatency = key.toLowerCase().includes('latency') || key.toLowerCase().includes('time');
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
      aria-label="Experiment Run Side-by-Side Comparison"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full text-[11px] font-bold uppercase tracking-widest font-mono">
              SIDE-BY-SIDE RUN DIFF
            </span>
            <span className="text-xs text-slate-400 font-mono">Human Review Governance</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            Experiment Comparison: Current vs Baseline
          </h3>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Comparison View"
            className="self-start sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none text-xs font-semibold rounded-xl text-slate-300 transition-all cursor-pointer"
          >
            ✕ Close Diff
          </button>
        )}
      </div>

      {/* Overview Cards: Run A vs Run B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Run A (Current) */}
        <div className="p-5 bg-slate-950 rounded-xl border-2 border-indigo-500/50 space-y-3 relative">
          <span className="absolute -top-3 left-4 px-2.5 py-0.5 bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md font-mono">
            RUN A (CURRENT)
          </span>
          <div className="pt-1">
            <h4 className="text-lg font-bold text-white">
              {activeRunA.model_name} <span className="text-xs font-mono text-indigo-400">v{activeRunA.version}</span>
            </h4>
            <p className="text-xs text-slate-400 font-mono">Dataset: {activeRunA.dataset}</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">Readiness Score</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {activeRunA.readiness_score}/100
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 block font-semibold mb-1">Decision Status</span>
            <span className="font-bold text-amber-300 font-mono">{activeRunA.decision}</span>
          </div>
        </div>

        {/* Run B (Baseline) */}
        <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3 relative">
          <span className="absolute -top-3 left-4 px-2.5 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md font-mono border border-slate-700">
            RUN B (BASELINE)
          </span>
          <div className="pt-1">
            <h4 className="text-lg font-bold text-white">
              {activeRunB.model_name} <span className="text-xs font-mono text-slate-400">v{activeRunB.version}</span>
            </h4>
            <p className="text-xs text-slate-400 font-mono">Dataset: {activeRunB.dataset}</p>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">Readiness Score</span>
            <span className="text-xl font-bold font-mono text-indigo-300">
              {activeRunB.readiness_score}/100
            </span>
          </div>

          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 block font-semibold mb-1">Decision Status</span>
            <span className="font-bold text-slate-300 font-mono">{activeRunB.decision}</span>
          </div>
        </div>
      </div>

      {/* Summary Score Delta Indicator */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
          Overall Readiness Delta (Run A vs Run B)
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold font-mono ${readinessDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {readinessDelta >= 0 ? `+${readinessDelta}` : readinessDelta} points
          </span>
          <span className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${readinessDelta >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
            {readinessDelta >= 0 ? 'IMPROVED' : 'DEGRADED'}
          </span>
        </div>
      </div>

      {/* Metrics Delta Comparison Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          Metrics Delta Matrix
        </h4>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th scope="col" className="p-3">Metric</th>
                <th scope="col" className="p-3 text-right">Run A ({activeRunA.version})</th>
                <th scope="col" className="p-3 text-right">Run B ({activeRunB.version})</th>
                <th scope="col" className="p-3 text-right">Delta</th>
                <th scope="col" className="p-3 text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {allMetricKeys.map((key) => {
                const { valA, valB, delta, isPositive } = calculateDelta(key);
                return (
                  <tr key={key} className="hover:bg-slate-950/60 transition-colors">
                    <td className="p-3 font-semibold text-slate-200 capitalize">
                      {key.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 text-right font-bold text-indigo-300">
                      {typeof valA === 'number' ? valA.toFixed(4) : valA}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {typeof valB === 'number' ? valB.toFixed(4) : valB}
                    </td>
                    <td className={`p-3 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {delta > 0 ? `+${delta.toFixed(4)}` : delta.toFixed(4)}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPositive
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {isPositive ? '▲ Better' : '▼ Worse'}
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
