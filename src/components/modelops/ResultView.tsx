'use client';

import React, { useState } from 'react';
import { ModelCardOutput, GovernanceAuditEntry } from '@/types/modelops';
import ReadinessScore from './ReadinessScore';
import EvidencePanel from './EvidencePanel';
import RunComparison from './RunComparison';
import ExportReport from './ExportReport';
import WhatWouldItTakeSimulator from './WhatWouldItTakeSimulator';
import ReadinessTimeline from './ReadinessTimeline';
import PolicyAuditPanel from './PolicyAuditPanel';
import {
  FileText,
  Zap,
  History,
  ShieldCheck,
  GitCompare,
  Download,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Database,
  Sparkles,
} from 'lucide-react';

interface ResultViewProps {
  modelCard?: ModelCardOutput;
  card?: ModelCardOutput;
  templateId?: string | null;
  sessionHistory?: ModelCardOutput[];
  onNewEvaluation?: () => void;
  onApplyFixes?: (simulatedCard: ModelCardOutput) => void;
}

type TabKey = 'dossier' | 'simulator' | 'timeline' | 'policy' | 'compare';

export default function ResultView({
  modelCard,
  card,
  templateId,
  sessionHistory = [],
  onNewEvaluation,
  onApplyFixes,
}: ResultViewProps) {
  const activeCard = card || modelCard;
  const [activeTab, setActiveTab] = useState<TabKey>('dossier');
  const [showExport, setShowExport] = useState(false);
  const [cardWithAudit, setCardWithAudit] = useState<ModelCardOutput>(activeCard as ModelCardOutput);

  if (!activeCard) return null;

  const handleAuditLogUpdated = (trail: GovernanceAuditEntry[]) => {
    setCardWithAudit({
      ...activeCard,
      audit_trail: trail,
    });
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; badge?: string }[] = [
    { key: 'dossier', label: 'Model Card Dossier', icon: <FileText className="w-4 h-4" /> },
    {
      key: 'simulator',
      label: '“What-If” Simulator',
      icon: <Zap className="w-4 h-4 text-amber-500" />,
      badge: 'Interactive',
    },
    {
      key: 'timeline',
      label: 'Readiness Timeline',
      icon: <History className="w-4 h-4 text-[#13715B]" />,
    },
    {
      key: 'policy',
      label: 'Policy & Audit Trail',
      icon: <ShieldCheck className="w-4 h-4 text-purple-600" />,
      badge: cardWithAudit.audit_trail?.length ? `${cardWithAudit.audit_trail.length} Signed` : undefined,
    },
    { key: 'compare', label: 'Run Comparison Diff', icon: <GitCompare className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 text-gray-900 animate-fadeIn">
      {/* 1. Header & Identity Bar with Action Toolbar */}
      <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-xs font-semibold uppercase tracking-wider font-mono">
              Model Evaluation Report
            </span>
            <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
              <Database className="w-3 h-3 text-gray-400" />
              Dataset: <strong className="text-gray-800">{activeCard.dataset}</strong>
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3 flex-wrap">
            <span>{activeCard.model_name}</span>
            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-mono font-medium rounded border border-gray-200">
              v{activeCard.version}
            </span>
          </h2>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowExport(!showExport)}
            aria-expanded={showExport}
            aria-label="Toggle Export Governance Report Panel"
            className={`px-3.5 py-1.5 text-xs font-semibold rounded border transition-all flex items-center gap-1.5 cursor-pointer ${
              showExport
                ? 'bg-purple-700 border-purple-700 text-white shadow-xs'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{showExport ? 'Hide Export' : 'Export Report'}</span>
          </button>

          {onNewEvaluation && (
            <button
              type="button"
              onClick={onNewEvaluation}
              aria-label="Start New Model Evaluation"
              className="px-3.5 py-1.5 bg-[#13715B] hover:bg-[#0f5c49] text-white text-xs font-semibold rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Evaluation</span>
            </button>
          )}
        </div>
      </div>

      {/* Export Report Drawer */}
      {showExport && (
        <ExportReport modelCard={cardWithAudit} onClose={() => setShowExport(false)} />
      )}

      {/* 2. Navigation Tab Bar for Advanced Intelligence Features */}
      <div className="bg-white border border-gray-300 rounded-md p-1.5 shadow-2xs flex flex-wrap gap-1">
        {tabs.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`flex-1 min-w-[140px] px-3.5 py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-[#13715B] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
              {t.badge && (
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded font-mono font-normal ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: MODEL CARD DOSSIER */}
      {activeTab === 'dossier' && (
        <div className="space-y-6">
          {/* Readiness Score & Decision Component */}
          <ReadinessScore score={activeCard.readiness_score} decision={activeCard.decision} />

          {/* Metrics Stat Grid */}
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-[#13715B]" />
              Model Performance Metrics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(activeCard.metrics || {}).map(([key, val]) => (
                <div
                  key={key}
                  className="p-3.5 bg-gray-50/80 rounded border border-gray-200 hover:border-[#13715B]/40 transition-all space-y-0.5"
                >
                  <span className="text-xs text-gray-500 font-mono capitalize block truncate" title={key}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className="text-lg font-bold font-mono text-gray-900 block">
                    {typeof val === 'number' ? (val % 1 !== 0 ? val.toFixed(4) : val) : val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Intended Use & Governance Scope */}
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
              <ShieldCheck className="w-4 h-4 text-[#13715B]" />
              Intended Use & Operational Context
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded border border-gray-200">
              {activeCard.intended_use}
            </p>
          </div>

          {/* Limitations and Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Limitations */}
            <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Known Model Limitations ({activeCard.limitations?.length || 0})
              </h3>
              <ul className="space-y-2 text-xs">
                {(activeCard.limitations || []).map((lim, idx) => (
                  <li key={idx} className="p-3 bg-amber-50/40 rounded border border-amber-200/70 flex items-start gap-2">
                    <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                    <span className="text-gray-800 leading-relaxed">{lim}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Risks */}
            <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                Identified Operational Risks ({activeCard.risks?.length || 0})
              </h3>
              <ul className="space-y-2 text-xs">
                {(activeCard.risks || []).map((risk, idx) => (
                  <li key={idx} className="p-3 bg-rose-50/40 rounded border border-rose-200/70 flex items-start gap-2">
                    <span className="text-rose-600 font-bold shrink-0 mt-0.5">▲</span>
                    <span className="text-gray-800 leading-relaxed">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Tests & Validation Suite */}
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-[#13715B]" />
              Validation Tests Executed ({activeCard.tests?.length || 0})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {(activeCard.tests || []).map((test, idx) => (
                <div key={idx} className="p-2.5 bg-gray-50 rounded border border-gray-200 flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#13715B] flex items-center justify-center text-[10px] shrink-0 font-bold">
                    ✓
                  </div>
                  <span className="text-gray-800 font-medium">{test}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reproducibility & Audit Trail */}
          <div className="bg-white border border-gray-300 rounded-md p-6 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2 font-mono">
              <Sparkles className="w-4 h-4 text-[#13715B]" />
              Reproducibility & Governance Audit Trail
            </h3>
            <p className="text-xs font-mono text-gray-700 bg-gray-50 p-3.5 rounded border border-gray-200 break-all">
              {activeCard.reproducibility}
            </p>
          </div>

          {/* Evidence Panel */}
          <EvidencePanel modelCard={activeCard} />
        </div>
      )}

      {/* TAB CONTENT 2: WHAT-IF SIMULATOR */}
      {activeTab === 'simulator' && (
        <WhatWouldItTakeSimulator currentCard={activeCard} onApplyFixes={onApplyFixes} />
      )}

      {/* TAB CONTENT 3: READINESS TIMELINE */}
      {activeTab === 'timeline' && (
        <ReadinessTimeline currentCard={activeCard} templateId={templateId} />
      )}

      {/* TAB CONTENT 4: POLICY & AUDIT TRAIL */}
      {activeTab === 'policy' && (
        <PolicyAuditPanel currentCard={cardWithAudit} onAuditLogUpdated={handleAuditLogUpdated} />
      )}

      {/* TAB CONTENT 5: RUN COMPARISON */}
      {activeTab === 'compare' && (
        <RunComparison
          runA={activeCard}
          templateId={templateId}
          sessionHistory={sessionHistory}
        />
      )}
    </div>
  );
}
