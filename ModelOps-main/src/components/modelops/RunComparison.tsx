import React from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { compare_runs } from '@/lib/modelops/tools';
import { ArrowUpRight, ArrowDownRight, Minus, Scale, TrendingUp, ShieldCheck } from 'lucide-react';

interface RunComparisonProps {
  run1: ModelCardOutput;
  run2: ModelCardOutput;
  onClose?: () => void;
}

export const RunComparison: React.FC<RunComparisonProps> = ({ run1, run2, onClose }) => {
  const comparison = compare_runs(run1, run2);

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
            <Scale className="w-4 h-4" /> Experiment Run Comparison
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Side-by-Side Model Diff & Delta Analysis
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close run comparison view"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            Close Comparison
          </button>
        )}
      </div>

      {/* Side-by-Side Identity Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Run 1 (Baseline) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Baseline (Run 1)
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-800 text-slate-300">
              v{run1.version}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">{run1.model_name}</h3>
          <p className="text-xs text-slate-400">Dataset: {run1.dataset}</p>
          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-900">
            <span className="text-slate-400">Readiness Score:</span>
            <span className="font-mono font-bold text-slate-200">{run1.readiness_score} / 100</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Decision:</span>
            <span className="font-mono font-semibold text-slate-300">{run1.decision}</span>
          </div>
        </div>

        {/* Run 2 (Candidate) */}
        <div className="p-4 rounded-xl bg-slate-950 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
              Candidate (Run 2)
            </span>
            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
              v{run2.version}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100">{run2.model_name}</h3>
          <p className="text-xs text-slate-400">Dataset: {run2.dataset}</p>
          <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-900">
            <span className="text-slate-400">Readiness Score:</span>
            <span className="font-mono font-bold text-blue-400">{run2.readiness_score} / 100</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Decision:</span>
            <span className="font-mono font-semibold text-blue-300">{run2.decision}</span>
          </div>
        </div>
      </div>

      {/* Readiness Delta Summary Banner */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-950 text-blue-400 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
        <div className="space-y-0.5">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Overall Governance Assessment
          </span>
          {comparison.summary.map((line, idx) => (
            <p key={idx} className="text-xs text-slate-200 leading-normal">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* Metric Deltas Table */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-400" /> Performance Metric Deltas
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3">Metric</th>
                <th className="py-2.5 px-3">Run 1 (v{run1.version})</th>
                <th className="py-2.5 px-3">Run 2 (v{run2.version})</th>
                <th className="py-2.5 px-3">Delta</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {comparison.metrics_diff.map((m) => {
                let badgeClass = 'bg-slate-800 text-slate-300';
                let Icon = Minus;
                if (m.direction === 'improved') {
                  badgeClass = 'bg-emerald-950 text-emerald-300 border border-emerald-800';
                  Icon = ArrowUpRight;
                } else if (m.direction === 'degraded') {
                  badgeClass = 'bg-red-950 text-red-300 border border-red-800';
                  Icon = ArrowDownRight;
                }

                return (
                  <tr key={m.metric_name} className="hover:bg-slate-950/50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-200">{m.metric_name}</td>
                    <td className="py-3 px-3 text-slate-400">{m.run1_value}</td>
                    <td className="py-3 px-3 text-slate-200 font-semibold">{m.run2_value}</td>
                    <td className="py-3 px-3">
                      <span className={m.delta > 0 ? 'text-emerald-400' : m.delta < 0 ? 'text-red-400' : 'text-slate-400'}>
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${badgeClass}`}>
                        <Icon className="w-3 h-3" />
                        {m.direction.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RunComparison;
