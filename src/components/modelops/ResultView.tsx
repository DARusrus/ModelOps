'use client';

import React, { useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import ReadinessScore from './ReadinessScore';
import EvidencePanel from './EvidencePanel';
import RunComparison from './RunComparison';
import ExportReport from './ExportReport';

interface ResultViewProps {
  modelCard?: ModelCardOutput;
  card?: ModelCardOutput;
  onNewEvaluation?: () => void;
}

export default function ResultView({ modelCard, card, onNewEvaluation }: ResultViewProps) {
  const activeCard = card || modelCard;
  const [showComparison, setShowComparison] = useState(false);
  const [showExport, setShowExport] = useState(false);

  if (!activeCard) return null;

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* 1. Header & Identity Bar with Action Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full text-xs font-semibold uppercase tracking-wider font-mono">
              Model Card Output
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Dataset: <strong className="text-slate-200">{activeCard.dataset}</strong>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 flex-wrap">
            <span>{activeCard.model_name}</span>
            <span className="px-3 py-1 bg-slate-800 text-slate-300 text-sm font-mono font-medium rounded-lg border border-slate-700">
              v{activeCard.version}
            </span>
          </h2>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setShowComparison(!showComparison);
              if (showExport) setShowExport(false);
            }}
            aria-expanded={showComparison}
            aria-label="Toggle Side-by-Side Run Comparison"
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
              showComparison
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{showComparison ? 'Hide Comparison' : 'Compare Runs (Diff)'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowExport(!showExport);
              if (showComparison) setShowComparison(false);
            }}
            aria-expanded={showExport}
            aria-label="Toggle Export Governance Report Panel"
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none ${
              showExport
                ? 'bg-purple-600 border-purple-400 text-white shadow-lg'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{showExport ? 'Hide Export' : 'Export Report'}</span>
          </button>

          {onNewEvaluation && (
            <button
              type="button"
              onClick={onNewEvaluation}
              aria-label="Start New Model Evaluation"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>New Evaluation</span>
            </button>
          )}
        </div>
      </div>

      {/* Conditional Modal Panels for Comparison and Export */}
      {showComparison && (
        <RunComparison
          runA={activeCard}
          onClose={() => setShowComparison(false)}
        />
      )}

      {showExport && (
        <ExportReport
          modelCard={activeCard}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* 2. Readiness Score & Decision Component */}
      <ReadinessScore
        score={activeCard.readiness_score}
        decision={activeCard.decision}
      />

      {/* 3. Metrics Stat Grid */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Model Performance Metrics
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(activeCard.metrics || {}).map(([key, val]) => (
            <div
              key={key}
              className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 hover:border-indigo-500/40 transition-all space-y-1"
            >
              <span className="text-xs text-slate-400 font-mono capitalize block truncate" title={key}>
                {key.replace(/_/g, ' ')}
              </span>
              <span className="text-xl font-bold font-mono text-indigo-300 block">
                {typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(4) : val) : val}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Intended Use & Governance Scope */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Intended Use & Operational Context
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-800">
          {activeCard.intended_use}
        </p>
      </div>

      {/* 5 & 6. Limitations and Risks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Limitations */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Known Model Limitations ({activeCard.limitations?.length || 0})
          </h3>
          <ul className="space-y-2 text-xs">
            {(activeCard.limitations || []).map((lim, idx) => (
              <li key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                <span className="text-slate-300 leading-normal">{lim}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Risks */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
            <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Identified Operational Risks ({activeCard.risks?.length || 0})
          </h3>
          <ul className="space-y-2 text-xs">
            {(activeCard.risks || []).map((risk, idx) => (
              <li key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-start gap-2.5">
                <span className="text-rose-400 font-bold shrink-0 mt-0.5">▲</span>
                <span className="text-slate-300 leading-normal">{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7. Tests & Validation Suite */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Validation Tests Executed ({activeCard.tests?.length || 0})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {(activeCard.tests || []).map((test, idx) => (
            <div key={idx} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center text-[10px] shrink-0 font-bold">
                ✓
              </div>
              <span className="text-slate-300 font-medium">{test}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Reproducibility & Audit Trail */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          Reproducibility & Governance Audit Trail
        </h3>
        <p className="text-xs font-mono text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 break-all">
          {activeCard.reproducibility}
        </p>
      </div>

      {/* 9. Evidence & Tool Findings Panel */}
      <EvidencePanel modelCard={activeCard} />
    </div>
  );
}
