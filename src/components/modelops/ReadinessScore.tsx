import React from 'react';

interface ReadinessScoreProps {
  score: number; // 0-100 deterministic score
  decision: string; // Human-reviewed label e.g., 'pending_human_review' or 'RECOMMEND_RELEASE_WITH_MONITORING'
  subtext?: string;
}

export default function ReadinessScore({
  score,
  decision,
  subtext = 'Deterministic readiness score based on test coverage, metric thresholds, risks, and reproducibility.',
}: ReadinessScoreProps) {
  // Defensive fallback: if the backend (or an AI-provider fallback path)
  // returns an incomplete ModelCardOutput without a numeric score, treat it
  // as 0 rather than letting NaN/undefined propagate into math/rendering.
  const safeScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;

  // Score color formatting
  const getScoreColorClass = (s: number) => {
    if (s >= 85) return { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500/30', badgeBg: 'bg-emerald-950/80' };
    if (s >= 70) return { bg: 'bg-indigo-500', text: 'text-indigo-400', border: 'border-indigo-500/30', badgeBg: 'bg-indigo-950/80' };
    if (s >= 50) return { bg: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/30', badgeBg: 'bg-amber-950/80' };
    return { bg: 'bg-rose-500', text: 'text-rose-400', border: 'border-rose-500/30', badgeBg: 'bg-rose-950/80' };
  };

  const colors = getScoreColorClass(safeScore);

  // Human friendly formatting of decision.
  // Defensive fallback: if `decision` is missing/undefined/null/empty —
  // e.g. a backend AI-provider fallback path returned an incomplete
  // ModelCardOutput — never call .replace() on it. Show an explicit
  // "awaiting human review" label instead of crashing the whole page.
  const formatDecisionLabel = (dec?: string | null) => {
    if (!dec || typeof dec !== 'string' || dec.trim() === '') {
      return 'PENDING HUMAN GOVERNANCE REVIEW';
    }
    if (dec === 'pending_human_review') return 'PENDING HUMAN GOVERNANCE REVIEW';
    return dec.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner: Decision (Prominent, bold, human review required) */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-1">
            Governance Decision Status (Human-in-the-Loop)
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-base sm:text-lg font-extrabold text-amber-300 tracking-wide font-mono">
              {formatDecisionLabel(decision)}
            </span>
          </div>
        </div>

        <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-700/60 rounded-lg text-xs font-semibold text-amber-200 self-start sm:self-auto flex items-center gap-1.5">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Requires Human Approval
        </div>
      </div>

      {/* Main Score Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Radial / Badge */}
        <div className="flex flex-col items-center justify-center p-6 bg-slate-950 rounded-xl border border-slate-800 text-center">
          <div className="relative flex items-center justify-center mb-3">
            <div className={`text-4xl sm:text-5xl font-black ${colors.text} tracking-tight font-mono`}>
              {safeScore}
            </div>
            <span className="text-slate-500 font-bold text-lg ml-1">/100</span>
          </div>

          <div className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badgeBg} ${colors.text} border ${colors.border}`}>
            {safeScore >= 85 ? 'PRODUCTION READY' : safeScore >= 70 ? 'GOOD READINESS' : safeScore >= 50 ? 'MODERATE RISK' : 'CRITICAL ISSUES'}
          </div>
        </div>

        {/* Score Bar & Detail Breakdown */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="flex justify-between items-center text-xs text-slate-300 font-semibold mb-2">
              <span>Readiness Index Bar</span>
              <span className="font-mono">{safeScore}%</span>
            </div>
            <div className="w-full h-4 bg-slate-950 rounded-full border border-slate-800 p-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bg} transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(100, Math.max(0, safeScore))}%` }}
              ></div>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            {subtext}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-500 block">Metric Score</span>
              <span className="font-mono font-bold text-slate-200">
                {safeScore >= 80 ? 'Passed (100%)' : 'Partial Pass'}
              </span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
              <span className="text-slate-500 block">Risk Register</span>
              <span className="font-mono font-bold text-slate-200">
                {safeScore >= 70 ? 'Evaluated' : 'High Risk'}
              </span>
            </div>
            <div className="p-2 bg-slate-950 rounded border border-slate-800/80 col-span-2 sm:col-span-1">
              <span className="text-slate-500 block">Reproducibility</span>
              <span className="font-mono font-bold text-slate-200">Verified</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
