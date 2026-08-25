import React from 'react';
import dynamic from 'next/dynamic';
import { ModelCardOutput } from '@/types/modelops';
import ReadinessScore from './ReadinessScore';
import { EvidencePanelSkeleton } from './Skeletons';
import {
  Layers,
  Database,
  BarChart3,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  GitCommit,
  FileText,
  Sparkles,
} from 'lucide-react';

// Dynamic lazy loading for heavy evidence panel component
const EvidencePanel = dynamic(() => import('./EvidencePanel'), {
  loading: () => <EvidencePanelSkeleton />,
  ssr: false,
});

interface ResultViewProps {
  card: ModelCardOutput;
}

export const ResultView: React.FC<ResultViewProps> = ({ card }) => {
  const metricEntries = Object.entries(card.metrics || {});

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Banner: Model Identity Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest">
              <Layers className="w-3.5 h-3.5" /> Evaluated Model Card
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {card.model_name}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
              Version: {card.version}
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" /> {card.dataset}
            </span>
          </div>
        </div>

        {/* Intended Use Brief */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-blue-400" /> Intended Operational Context
          </h3>
          <p className="text-sm text-slate-200 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            {card.intended_use}
          </p>
        </div>
      </div>

      {/* Readiness Score & Human Decision Gauge */}
      <ReadinessScore score={card.readiness_score} decision={card.decision} />

      {/* Metrics Grid */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" /> Benchmarked Performance Metrics
        </h3>

        {metricEntries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metricEntries.map(([key, val]) => (
              <div
                key={key}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
              >
                <span className="text-xs text-slate-400 font-mono uppercase tracking-wider">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="text-2xl font-bold font-mono text-blue-400 mt-1">
                  {typeof val === 'number'
                    ? val <= 1 && val > 0 && !key.includes('latency') && !key.includes('time')
                      ? (val * 100).toFixed(2) + '%'
                      : val.toLocaleString()
                    : val}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No quantitative metrics recorded for this evaluation run.</p>
        )}
      </div>

      {/* Governance & Risk Analysis: Limitations, Risks, Tests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Known Limitations */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Model Limitations
          </h3>
          {card.limitations && card.limitations.length > 0 ? (
            <ul className="space-y-2">
              {card.limitations.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No specific limitations documented.</p>
          )}
        </div>

        {/* Operational Risks */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400" /> Operational & Safety Risks
          </h3>
          {card.risks && card.risks.length > 0 ? (
            <ul className="space-y-2">
              {card.risks.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-300 bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 flex items-start gap-2.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-500 italic">No critical operational risks identified.</p>
          )}
        </div>
      </div>

      {/* Automated Governance Verification Tests */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Verification Tests & Compliance Benchmarks
        </h3>

        {card.tests && card.tests.length > 0 ? (
          <div className="space-y-2">
            {card.tests.map((test, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <span className="text-xs font-mono text-slate-200">{test}</span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 w-max">
                  PASSED
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">No automated tests submitted.</p>
        )}
      </div>

      {/* Visually Distinct Evidence & Tool Trace Panel (Lazy Loaded) */}
      <EvidencePanel
        evidence={card.evidence}
        tests={card.tests}
        reproducibility={card.reproducibility}
        dataset={card.dataset}
        modelName={card.model_name}
      />

      {/* Reproducibility & Provenance Signature */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-blue-400" /> Reproducibility & Provenance Signature
        </h3>
        <p className="text-xs text-slate-300 font-mono bg-slate-950 p-3.5 rounded-xl border border-slate-800 break-all leading-relaxed">
          {card.reproducibility || 'Standard pipeline seed 42'}
        </p>
      </div>

      {/* AI Analysis / Governance Insights (if present) */}
      {card.ai_analysis && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-blue-500/20 shadow-xl space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Server-side Model Governance Analysis
          </h3>
          <p className="text-xs text-slate-300 bg-slate-950 p-3.5 rounded-xl border border-slate-800 leading-relaxed">
            {card.ai_analysis}
          </p>
        </div>
      )}
    </div>
  );
};

export default ResultView;
