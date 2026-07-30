'use client';

import React, { useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';

interface ExportReportProps {
  modelCard?: ModelCardOutput;
  card?: ModelCardOutput;
  onClose?: () => void;
}

export default function ExportReport({ modelCard, card, onClose }: ExportReportProps) {
  const activeCard = card || modelCard;
  const [copied, setCopied] = useState(false);

  if (!activeCard) return null;

  const generateMarkdownReport = (): string => {
    return `# ModelOps Governance Report: ${activeCard.model_name} (v${activeCard.version})
**Generated Date:** ${new Date().toISOString().split('T')[0]}
**Dataset:** ${activeCard.dataset}
**Readiness Score:** ${activeCard.readiness_score}/100
**Governance Decision:** ${activeCard.decision}

---

## 1. Executive Summary & Intended Use
${activeCard.intended_use}

## 2. Evaluation Metrics
${Object.entries(activeCard.metrics || {})
  .map(([k, v]) => `- **${k}**: ${v}`)
  .join('\n')}

## 3. Known Limitations
${(activeCard.limitations || []).map((l) => `- ${l}`).join('\n')}

## 4. Identified Operational Risks
${(activeCard.risks || []).map((r) => `- ${r}`).join('\n')}

## 5. Validation Tests
${(activeCard.tests || []).map((t) => `- [x] ${t}`).join('\n')}

## 6. Reproducibility Metadata
\`\`\`
${activeCard.reproducibility}
\`\`\`

---
*ModelOps Automated Governance Audit Trail — Human Sign-off Required*
`;
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeCard, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `model_card_${activeCard.model_name}_v${activeCard.version}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdownReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy report to clipboard:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section
      aria-label="Export Governance Model Card Report"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-in text-slate-100"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded-full text-[11px] font-bold uppercase tracking-widest font-mono">
              EXPORT & AUDIT REPORT
            </span>
            <span className="text-xs text-slate-400 font-mono">Governance Artifact</span>
          </div>
          <h3 className="text-2xl font-extrabold text-white tracking-tight">
            Export Model Card & Compliance Record
          </h3>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Export Panel"
            className="self-start sm:self-auto px-3.5 py-2 bg-slate-800 hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none text-xs font-semibold rounded-xl text-slate-300 transition-all cursor-pointer"
          >
            ✕ Close
          </button>
        )}
      </div>

      {/* Export Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Download JSON */}
        <button
          type="button"
          onClick={handleDownloadJSON}
          className="p-5 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all space-y-2 cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
        >
          <div className="w-10 h-10 bg-indigo-950 border border-indigo-800 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-white">Download JSON Schema</h4>
          <p className="text-xs text-slate-400">Structured JSON model card matching backend output contract.</p>
        </button>

        {/* Copy Markdown */}
        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="p-5 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all space-y-2 cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
        >
          <div className="w-10 h-10 bg-indigo-950 border border-indigo-800 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-white">
            {copied ? '✓ Copied to Clipboard!' : 'Copy Markdown Summary'}
          </h4>
          <p className="text-xs text-slate-400">Copy formatted Markdown document for documentation & PR descriptions.</p>
        </button>

        {/* Print PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="p-5 bg-slate-950 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all space-y-2 cursor-pointer group focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:outline-none"
        >
          <div className="w-10 h-10 bg-indigo-950 border border-indigo-800 rounded-lg flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-white">Print / Export PDF</h4>
          <p className="text-xs text-slate-400">Print or save as PDF formatted governance compliance report.</p>
        </button>
      </div>

      {/* Markdown Preview Area */}
      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          Markdown Report Preview
        </span>
        <textarea
          readOnly
          rows={6}
          value={generateMarkdownReport()}
          aria-label="Markdown Report Preview Text"
          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none resize-none"
        />
      </div>
    </section>
  );
}
