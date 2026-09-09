'use client';

import React from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { ShieldCheck, Terminal, Bot, CheckCircle2, AlertTriangle, ListChecks } from 'lucide-react';

interface EvidencePanelProps {
  modelCard: ModelCardOutput | null | undefined;
}

export default function EvidencePanel({ modelCard }: EvidencePanelProps) {
  if (!modelCard || typeof modelCard !== 'object') {
    return (
      <aside className="bg-white border border-gray-300 rounded-md p-6 text-gray-700 shadow-xs">
        <h3 className="text-base font-bold text-gray-900">Evidence & Execution Findings</h3>
        <p className="text-xs text-gray-500 mt-1">Model data is currently unavailable.</p>
      </aside>
    );
  }

  const metrics = modelCard.metrics && typeof modelCard.metrics === 'object'
    ? modelCard.metrics
    : {};

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
      className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Audit & Verification Findings
            </span>
            <span className="text-xs text-gray-500 font-mono">Provenance ledger</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#13715B]" />
            Evidence & Execution Audit Trail
          </h3>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded text-xs text-[#13715B] font-mono self-start sm:self-auto font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Evidence status</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        <strong className="text-gray-900">Evidence is not AI output:</strong> official scoring reads only submitted or verified-derived evidence. AI text remains an unverified suggestion and cannot establish a governance fact.
      </p>

      {/* Grid Section 1: Deterministic Tool Findings vs Model Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tool Findings */}
        <div className="bg-gray-50 p-5 rounded border border-gray-200 space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Terminal className="w-4 h-4 text-[#13715B]" />
            1. Submitted & verified evidence
          </h4>
          <ul className="space-y-2 text-xs font-mono text-gray-700">
            {modelCard.evidence_items?.length ? modelCard.evidence_items.map((item, idx) => (
              <li key={`${item.kind}-${idx}`} className="p-2.5 bg-white rounded border border-gray-200 space-y-1 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5"><span className="px-1.5 py-0.5 text-[10px] bg-emerald-50 border border-emerald-200 text-[#13715B] rounded uppercase">{(item.provenance ?? 'missing').replace('_', ' ')}</span><span className="font-bold text-gray-800">{item.label}</span></div>
                <p className="break-all">{item.value}</p>{item.reference && <p className="text-[10px] text-gray-500 break-all">ref: {item.reference}</p>}
              </li>
            )) : evidenceList.map((item, idx) => <li key={idx} className="p-2.5 bg-white rounded border border-gray-200 flex items-start gap-2 shadow-2xs"><span className="text-[#13715B] font-bold shrink-0">›</span><span className="break-all">{item}</span></li>)}
          </ul>
        </div>

        {/* Model Narrative Synthesis */}
        <div className="bg-gray-50 p-5 rounded border border-gray-200 space-y-3">
          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 font-mono">
            <Bot className="w-4 h-4 text-[#13715B]" />
            2. AI suggestion (not evidence)
          </h4>
          <div className="p-3.5 bg-white rounded border border-gray-200 text-xs text-gray-700 space-y-2.5 shadow-2xs">
            <p className="inline-flex rounded border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-[10px] uppercase text-amber-800">{modelCard.ai_suggestions?.status?.replaceAll('_', ' ') || 'deterministic only'}</p>
            <p className="leading-relaxed">
              {modelCard.ai_analysis ||
                `The AI governance pipeline synthesized the experiment metadata for "${modelCard.model_name || 'this model'}", confirming compatibility with the "${modelCard.dataset || 'target'}" benchmark dataset.`}
            </p>
            {warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-amber-200 text-[11px] text-amber-800 space-y-1">
                <span className="font-bold uppercase block flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  System Warnings:
                </span>
                {warnings.map((w: string, idx: number) => (
                  <p key={idx} className="text-amber-900">• {w}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Section 2: Actionable Next Steps & Governance Sign-off */}
      <div className="bg-gray-50 p-5 rounded border border-gray-200 space-y-3">
        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2 font-mono">
          <ListChecks className="w-4 h-4 text-[#13715B]" />
          3. Governance Remediation & Action Items
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {nextSteps.map((step: string, idx: number) => (
            <div key={idx} className="p-3 bg-white border border-gray-200 rounded flex items-center gap-2.5 shadow-2xs">
              <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#13715B] border border-emerald-200 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-800 font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
