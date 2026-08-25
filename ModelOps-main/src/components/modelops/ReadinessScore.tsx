import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, UserCheck } from 'lucide-react';

interface ReadinessScoreProps {
  score: number;
  decision: string;
}

export const ReadinessScore: React.FC<ReadinessScoreProps> = ({ score, decision }) => {
  // Normalize score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color theme based on score thresholds
  const getScoreTheme = (s: number) => {
    if (s >= 80) {
      return {
        bg: 'bg-emerald-950/40',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        badgeBg: 'bg-emerald-900/60',
        badgeText: 'text-emerald-300',
        icon: ShieldCheck,
        label: 'High Production Readiness',
      };
    }
    if (s >= 60) {
      return {
        bg: 'bg-amber-950/40',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        badgeBg: 'bg-amber-900/60',
        badgeText: 'text-amber-300',
        icon: AlertTriangle,
        label: 'Moderate Readiness — Governance Review Required',
      };
    }
    return {
      bg: 'bg-red-950/40',
      border: 'border-red-500/30',
      text: 'text-red-400',
      bar: 'bg-gradient-to-r from-red-500 to-rose-500',
      badgeBg: 'bg-red-900/60',
      badgeText: 'text-red-300',
      icon: XCircle,
      label: 'Low Readiness — High Operational Risk',
    };
  };

  const theme = getScoreTheme(normalizedScore);
  const StatusIcon = theme.icon;

  // Format decision label for display
  const formatDecisionLabel = (d: string) => {
    switch (d.toUpperCase()) {
      case 'APPROVED_FOR_STAGING':
      case 'APPROVED':
        return {
          title: 'RECOMMENDED FOR STAGING',
          badgeClass: 'bg-emerald-900/80 text-emerald-200 border-emerald-700',
          description: 'Model meets target readiness criteria. Final sign-off requires engineer authorization.',
        };
      case 'REJECTED_HIGH_RISK':
      case 'REJECTED':
        return {
          title: 'RELEASE REJECTED (HIGH RISK)',
          badgeClass: 'bg-red-900/80 text-red-200 border-red-700',
          description: 'Model fails governance threshold. Remediation of identified risks required before re-evaluation.',
        };
      case 'REQUIRES_HUMAN_REVIEW':
      case 'PENDING_HUMAN_REVIEW':
      default:
        return {
          title: 'REQUIRES MANDATORY HUMAN REVIEW',
          badgeClass: 'bg-amber-900/80 text-amber-200 border-amber-700',
          description: 'Model evaluation complete. Release decision queued for human workflow engineer review.',
        };
    }
  };

  const decisionInfo = formatDecisionLabel(decision);

  return (
    <div className={`p-5 md:p-6 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-md shadow-xl space-y-6`}>
      {/* Top Header: Readiness Score Gauge */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-5 h-5 ${theme.text}`} />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              Readiness Score Gauge
            </h3>
          </div>
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${theme.badgeBg} ${theme.badgeText} w-max`}>
            {theme.label}
          </span>
        </div>

        {/* Big Score Display & Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${theme.text}`}>
              {normalizedScore}
              <span className="text-xl text-slate-500 font-normal"> / 100</span>
            </span>
            <span className="text-xs text-slate-400 font-mono">Deterministic Calculation</span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 p-0.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${theme.bar} transition-all duration-700 ease-out`}
              style={{ width: `${normalizedScore}%` }}
              role="progressbar"
              aria-valuenow={normalizedScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Model Readiness Score Progress"
            />
          </div>
        </div>
      </div>

      {/* Human Governance Review & Release Decision Box */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
        <div className="flex items-center gap-2 text-slate-300">
          <UserCheck className="w-4 h-4 text-blue-400 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Release Recommendation (Human Review Only)
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-1">
            <div className={`inline-flex items-center px-3 py-1 rounded-md border font-mono text-xs font-bold ${decisionInfo.badgeClass}`}>
              {decisionInfo.title}
            </div>
            <p className="text-xs text-slate-300 leading-normal">
              {decisionInfo.description}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-800/80">
          * ModelOps policy strictly prohibits automated approval. A human workflow engineer must manually verify evidence before production deployment.
        </p>
      </div>
    </div>
  );
};

export default ReadinessScore;
