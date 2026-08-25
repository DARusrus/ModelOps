'use client';

import React, { useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { Download, Copy, Check, Printer, FileText, X, ShieldCheck } from 'lucide-react';

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
      className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Export & Compliance Dossier
            </span>
            <span className="text-xs text-gray-500 font-mono">Audit Artifact</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Download className="w-5 h-5 text-[#13715B]" />
            Export Model Card & Governance Report
          </h3>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Export Panel"
            className="self-start sm:self-auto px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs font-semibold rounded text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Close Export
          </button>
        )}
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        Download structured metadata dossiers for integration into enterprise model registries, compliance archives, or regulatory filings (EU AI Act Technical Documentation, NIST AI RMF).
      </p>

      {/* Action Buttons Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={handleDownloadJSON}
          className="p-3.5 rounded border border-[#13715B] bg-[#13715B] hover:bg-[#0f5c49] text-white flex items-center justify-center gap-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Download JSON Dossier</span>
        </button>

        <button
          type="button"
          onClick={handleCopyMarkdown}
          className="p-3.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
          <span>{copied ? 'Markdown Copied!' : 'Copy Markdown Report'}</span>
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="p-3.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 flex items-center justify-center gap-2 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
        >
          <Printer className="w-4 h-4 text-gray-500" />
          <span>Print / Save as PDF</span>
        </button>
      </div>

      {/* Markdown Document Preview Box */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#13715B]" />
          Governance Report Preview (Markdown)
        </span>
        <pre className="p-4 rounded bg-gray-50 border border-gray-200 text-gray-800 text-xs font-mono overflow-x-auto max-h-64 leading-relaxed whitespace-pre-wrap">
          {generateMarkdownReport()}
        </pre>
      </div>
    </section>
  );
}
