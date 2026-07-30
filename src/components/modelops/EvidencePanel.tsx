import React from 'react';
import { ModelCardOutput } from '@/types/modelops';

interface EvidencePanelProps {
  modelCard: ModelCardOutput | null | undefined;
}

export default function EvidencePanel({ modelCard }: EvidencePanelProps) {
  // 1. الحماية الأولى: إذا لم تكن بيانات الموديل موجودة تماماً، لا تقم بتنفيذ الكود
  if (!modelCard || typeof modelCard !== 'object') {
    return (
      <aside className="bg-slate-900 border border-indigo-500/40 rounded-2xl p-6 text-white">
        <h3 className="text-xl font-bold">Evidence & Execution Findings</h3>
        <p className="text-sm text-slate-400 mt-2">Model data is currently unavailable.</p>
      </aside>
    );
  }

  // 2. الحماية الثانية: التأكد من أن metrics كائن (Object) قبل استخدام Object.keys
  const metrics = modelCard.metrics && typeof modelCard.metrics === 'object'
    ? modelCard.metrics
    : {};

  // 3. الحماية الثالثة: التأكد من أن المصفوفات موجودة باستخدام Array.isArray
  const evidenceList = Array.isArray(modelCard.evidence) && modelCard.evidence.length > 0
    ? modelCard.evidence
    : [
      `Model Identity: ${modelCard.model_name || 'Unknown'} (v${modelCard.version || 'N/A'})`,
      `Evaluation Dataset: ${modelCard.dataset || 'Unknown'}`,
      `Deterministic Readiness Score Tool Result: ${typeof modelCard.readiness_score === 'number' ? modelCard.readiness_score : 0}/100`,
      `Metrics Verified: ${Object.keys(metrics).join(', ') || 'None'}`,
      `Reproducibility Artifact: ${modelCard.reproducibility || 'Not provided'}`,
    ];

  const warnings = Array.isArray(modelCard.warnings) ? modelCard.warnings : [];

  const nextSteps = Array.isArray(modelCard.next_steps) && modelCard.next_steps.length > 0
    ? modelCard.next_steps
    : [
      'Perform human governance review before promoting model to production.',
      'Configure continuous model monitoring for dataset drift and latency spikes.',
    ];

  return (
    <aside
      aria-label="Evidence & Tool Findings Panel"
      className="bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950/40 border-2 border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden"
    >
      {/* Decorative Top Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400"></div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-indigo-900/50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700/60 rounded-md text-[11px] font-bold uppercase tracking-widest font-mono">
              TOOL & EVIDENCE AUDIT TRAIL
            </span>
            <span className="text-xs text-indigo-400/80 font-mono">Deterministic Verification</span>
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Evidence & Execution Findings
          </h3>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/80 border border-indigo-800/80 rounded-lg text-xs text-indigo-200 font-mono">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span>Verified Tool Execution</span>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed">
        <strong className="text-cyan-300">Tool Findings vs Model Narrative:</strong> The items below represent raw, deterministic outputs produced directly by automated evaluation tools and static analysis pipelines. They are structurally isolated from LLM-generated prose to prevent hallucinated governance claims.
      </p>

      {/* Grid Section 1: Deterministic Tool Findings vs Model Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool Findings */}
        <div className="bg-slate-950/90 p-5 rounded-xl border border-indigo-900/60 space-y-3">
          <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2 font-mono">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            1. What Deterministic Tools Found
          </h4>
          <ul className="space-y-2 text-xs font-mono text-slate-300">
            {evidenceList.map((item: string, idx: number) => (
              <li key={idx} className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 flex items-start gap-2">
                <span className="text-cyan-400 font-bold shrink-0">›</span>
                <span className="break-all">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Model Narrative Synthesis */}
        <div className="bg-slate-950/90 p-5 rounded-xl border border-purple-900/60 space-y-3">
          <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2 font-mono">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            2. What Model Concluded (AI Narrative)
          </h4>
          <div className="p-3 bg-slate-900/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2">
            <p className="leading-relaxed">
              {modelCard.ai_analysis ||
                `The AI governance pipeline synthesized the experiment metadata for "${modelCard.model_name || 'this model'}", confirming compatibility with the "${modelCard.dataset || 'target'}" benchmark dataset.`}
            </p>
            {warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-900/50 text-[11px] text-amber-300 space-y-1">
                <span className="font-semibold uppercase block">System Warnings:</span>
                {warnings.map((w: string, idx: number) => (
                  <p key={idx}>⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section 2: Actionable Next Steps & Governance Sign-off */}
      <div className="bg-slate-950/90 p-5 rounded-xl border border-indigo-900/60 space-y-3">
        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2 font-mono">
          <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          3. Governance Remediation & Action Items
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {nextSteps.map((step: string, idx: number) => (
            <div key={idx} className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-900 text-indigo-300 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                {idx + 1}
              </span>
              <span className="text-slate-200">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}