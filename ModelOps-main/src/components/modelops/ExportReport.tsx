import React, { useState } from 'react';
import { ModelCardOutput } from '@/types/modelops';
import { Printer, Download, FileText, Check, ShieldCheck } from 'lucide-react';

interface ExportReportProps {
  card: ModelCardOutput;
}

export const ExportReport: React.FC<ExportReportProps> = ({ card }) => {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(card, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-card-${card.model_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${card.version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const mdContent = `# Model Card: ${card.model_name} (Version: ${card.version})

## Model Overview
- **Model Name:** ${card.model_name}
- **Version Tag:** ${card.version}
- **Evaluation Dataset:** ${card.dataset}
- **Readiness Score:** ${card.readiness_score} / 100
- **Governance Decision:** ${card.decision}

## Intended Operational Context
${card.intended_use}

## Benchmarked Metrics
${Object.entries(card.metrics || {})
  .map(([k, v]) => `- **${k}:** ${v}`)
  .join('\n')}

## Limitations
${(card.limitations || []).map((item) => `- ${item}`).join('\n')}

## Operational & Safety Risks
${(card.risks || []).map((item) => `- ${item}`).join('\n')}

## Verification Tests
${(card.tests || []).map((item) => `- ${item}`).join('\n')}

## Reproducibility Signature
\`${card.reproducibility}\`

---
*Report generated via ModelOps Governance Engine for Human Review.*
`;

    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-card-${card.model_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${card.version}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4 text-slate-100 print:hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-widest mb-1">
            <ShieldCheck className="w-4 h-4" /> Governance Artifact Exporter
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Export Model Card & Compliance Audit Report
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate formal documentation for human sign-off, staging deployment, or auditing.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Print / Save PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 text-xs font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-blue-400" />
          Print / Save PDF Report
        </button>

        {/* Download Markdown */}
        <button
          type="button"
          onClick={handleDownloadMarkdown}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 text-xs font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-amber-400" />}
          {copied ? 'Markdown Downloaded' : 'Export Markdown (.md)'}
        </button>

        {/* Download JSON */}
        <button
          type="button"
          onClick={handleDownloadJSON}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Download JSON Audit Schema
        </button>
      </div>
    </div>
  );
};

export default ExportReport;
