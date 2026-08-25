import React from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface ReadinessScoreProps {
  score: number;
  decision: string;
  subtext?: string;
}

export default function ReadinessScore({
  score,
  decision,
  subtext = 'Deterministic readiness score computed across 5 weighted categories: basic metadata (10%), intended use (15%), metric validation (25%), risk mitigations (25%), and reproducibility integrity (25%).',
}: ReadinessScoreProps) {
  const safeScore = typeof score === 'number' && !Number.isNaN(score) ? score : 0;

  const getScoreColorClass = (s: number) => {
    if (s >= 85) return { bg: 'bg-[#13715B]', text: 'text-[#13715B]', border: 'border-emerald-200', badgeBg: 'bg-emerald-50' };
    if (s >= 70) return { bg: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', badgeBg: 'bg-blue-50' };
    if (s >= 50) return { bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', badgeBg: 'bg-amber-50' };
    return { bg: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-200', badgeBg: 'bg-rose-50' };
  };

  const colors = getScoreColorClass(safeScore);

  const formatDecisionLabel = (dec?: string | null) => {
    if (!dec || typeof dec !== 'string' || dec.trim() === '') {
      return 'PENDING HUMAN GOVERNANCE REVIEW';
    }
    if (dec === 'pending_human_review') return 'PENDING HUMAN GOVERNANCE REVIEW';
    return dec.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-6">
      {/* Top Banner: Decision (Human-in-the-loop Governance Invariant) */}
      <div className="p-4 bg-amber-50/70 rounded border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
            Governance Decision Status (Human-in-the-Loop)
          </span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm sm:text-base font-bold text-amber-900 tracking-wide font-mono">
              {formatDecisionLabel(decision)}
            </span>
          </div>
        </div>

        <div className="px-3 py-1 bg-white border border-amber-300 rounded text-xs font-semibold text-amber-800 self-start sm:self-auto flex items-center gap-1.5 shadow-2xs">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          Mandatory Human Review Gate
        </div>
      </div>

      {/* Main Score Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Radial / Badge */}
        <div className="flex flex-col items-center justify-center p-6 bg-gray-50/80 rounded border border-gray-200 text-center">
          <div className="relative flex items-baseline justify-center mb-2">
            <span className={`text-4xl sm:text-5xl font-black ${colors.text} tracking-tight font-mono`}>
              {safeScore}
            </span>
            <span className="text-gray-400 font-bold text-base ml-1">/100</span>
          </div>

          <div className={`px-3 py-0.5 rounded text-xs font-bold ${colors.badgeBg} ${colors.text} border ${colors.border}`}>
            {safeScore >= 85 ? 'HIGH READINESS' : safeScore >= 70 ? 'GOOD READINESS' : safeScore >= 50 ? 'MODERATE RISK' : 'CRITICAL ISSUES'}
          </div>
        </div>

        {/* Score Bar & Detail Breakdown */}
        <div className="md:col-span-2 space-y-3">
          <div>
            <div className="flex justify-between items-center text-xs text-gray-700 font-semibold mb-1.5">
              <span>Deterministic Readiness Index</span>
              <span className="font-mono text-gray-900 font-bold">{safeScore}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full border border-gray-200 p-0.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${colors.bg} transition-all duration-700 ease-out`}
                style={{ width: `${Math.min(100, Math.max(0, safeScore))}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 leading-relaxed">
            {subtext}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px]">
              <span className="text-gray-500 block">Metadata</span>
              <span className="font-bold text-gray-800">10 pts</span>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px]">
              <span className="text-gray-500 block">Use Scope</span>
              <span className="font-bold text-gray-800">15 pts</span>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px]">
              <span className="text-gray-500 block">Metrics</span>
              <span className="font-bold text-gray-800">25 pts</span>
            </div>
            <div className="p-2 bg-gray-50 border border-gray-200 rounded text-[11px]">
              <span className="text-gray-500 block">Risks & Repro</span>
              <span className="font-bold text-gray-800">50 pts</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
