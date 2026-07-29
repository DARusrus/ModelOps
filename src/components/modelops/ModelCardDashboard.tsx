'use client';

import React from 'react';
import { ModelCardOutput, ReadinessResult, RiskResult } from '@/types';
import { ShieldAlert, CheckCircle, FileJson, ArrowLeft, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { cn } from '@/lib/utils';
import { useEffect, useMemo, useState } from 'react';
import { AIRecommendationBadge } from './AIRecommendationBadge';
import { AIChangePreview } from './AIChangePreview';
import { AIAutoFixSummary } from './AIAutoFixSummary';
import { AIThinkingLoader } from './AIThinkingLoader';
import { applyAllSuggestions, applySuggestionToField, buildAIAssistantSuggestions, type AIAssistantSuggestion } from '@/lib/modelops/ai-assistant';

interface ModelCardDashboardProps {
  data: ModelCardOutput;
  readiness: ReadinessResult;
  risk: RiskResult;
  provider: string | null;
  onReset: () => void;
}

export default function ModelCardDashboard({ data, readiness, risk, provider, onReset }: ModelCardDashboardProps) {
  const [draftData, setDraftData] = useState(data);
  const [assistantSuggestions, setAssistantSuggestions] = useState<AIAssistantSuggestion[]>([]);
  const [showAssistant, setShowAssistant] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [previewSuggestion, setPreviewSuggestion] = useState<AIAssistantSuggestion | null>(null);
  const [previewAllSuggestions, setPreviewAllSuggestions] = useState<AIAssistantSuggestion[]>([]);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const [beforeScore, setBeforeScore] = useState(readiness.score);
  const [afterScore, setAfterScore] = useState(readiness.score);
  const [explainHint, setExplainHint] = useState<string | null>(null);

  useEffect(() => {
    setDraftData(data);
    setBeforeScore(readiness.score);
    setAfterScore(readiness.score);
    setAppliedCount(0);
    setShowLoader(true);
    setShowAssistant(true);
    setSummaryOpen(false);
    setExplainHint(null);

    const timer = window.setTimeout(() => {
      const nextSuggestions = buildAIAssistantSuggestions(data);
      setAssistantSuggestions(nextSuggestions);
      setShowLoader(false);
      setShowAssistant(true);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [data, readiness.score]);

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify({ model_card: draftData, readiness, risk, provider }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model-card-${draftData.model_name.toLowerCase().replace(/\s+/g, '-')}-${draftData.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metricData = Object.entries(draftData.metrics || {}).map(([key, value]) => ({
    name: key.replace(/_/g, ' '),
    value: Number(value)
  }));

  const readinessData = [{ name: 'Readiness', value: readiness.score }];

  const isApproved = readiness.decision === 'APPROVED';
  const isRejected = readiness.decision === 'REJECTED';
  const readinessReasons = readiness.reasons ?? [];
  const riskReasons = risk.reasons ?? [];
  const summarySections = [
    { title: 'Executive Summary', body: draftData.executive_summary || draftData.overview || draftData.experiment_info },
    { title: 'Architecture Analysis', body: draftData.architecture_analysis || draftData.architecture },
    { title: 'Training Analysis', body: draftData.training_analysis || draftData.training_details },
    { title: 'Dataset Analysis', body: draftData.dataset_analysis || draftData.dataset_description },
    { title: 'Evaluation Analysis', body: draftData.evaluation_analysis || draftData.evaluation },
    { title: 'Deployment Analysis', body: draftData.deployment_analysis || draftData.deployment_readiness },
    { title: 'Production Readiness', body: draftData.production_readiness || draftData.deployment_readiness },
    { title: 'Security Analysis', body: draftData.security_analysis || draftData.security_considerations },
  ].filter((section) => Boolean(section.body));
  const recommendationItems = [...(draftData.recommendations || []), ...(draftData.suggested_fixes || []), ...(draftData.next_steps || [])].slice(0, 8);
  const evidenceItems = [...(draftData.evidence || []), ...(draftData.confidence_notes || []), ...(draftData.assumptions || [])].slice(0, 8);
  const riskLevelClass = risk.level?.toLowerCase() === 'critical' ? 'text-red-500' :
    risk.level?.toLowerCase() === 'high' ? 'text-orange-500' :
    risk.level?.toLowerCase() === 'medium' ? 'text-yellow-500' : 'text-green-500';

  const severityLabel = useMemo(() => {
    const highest = assistantSuggestions.reduce((acc, suggestion) => Math.max(acc, suggestion.confidence), 0);
    if (highest >= 0.95) return 'High';
    if (highest >= 0.9) return 'Medium';
    return 'Low';
  }, [assistantSuggestions]);

  const handleApplySuggestion = (suggestion: AIAssistantSuggestion) => {
    setPreviewSuggestion(suggestion);
    setPreviewAllSuggestions([]);
  };

  const handleAssistantApply = (field: string, value: string) => {
    const expectedField = field as keyof ModelCardOutput;
    const candidate = assistantSuggestions.find((suggestion) => suggestion.fieldKey === expectedField || suggestion.fieldName === field);
    const fallbackSuggestion: AIAssistantSuggestion = {
      fieldName: field,
      fieldKey: expectedField,
      problem: 'Assistant proposed an update.',
      reason: 'The assistant wants to improve the current field.',
      suggestion: value,
      impact: 'Immediate clarity improvement.',
      confidence: 0.9,
    };
    setPreviewSuggestion(candidate ?? fallbackSuggestion);
    setPreviewAllSuggestions([]);
  };

  const handleApplyAll = () => {
    setPreviewAllSuggestions(assistantSuggestions);
    setPreviewSuggestion(null);
  };

  const handleConfirmPreview = () => {
    if (previewAllSuggestions.length > 0) {
      setDraftData((current) => applyAllSuggestions(current, previewAllSuggestions));
      const applied = previewAllSuggestions.length;
      setAppliedCount((count) => count + applied);
      setAfterScore(Math.min(100, readiness.score + applied * 2));
      setAssistantSuggestions((current) => current.filter((suggestion) => !previewAllSuggestions.includes(suggestion)));
      setPreviewAllSuggestions([]);
      setSummaryOpen(true);
      return;
    }

    if (previewSuggestion) {
      setDraftData((current) => applySuggestionToField(current, previewSuggestion));
      const applied = 1;
      setAppliedCount((count) => count + applied);
      setAfterScore(Math.min(100, readiness.score + applied * 2));
      setAssistantSuggestions((current) => current.filter((suggestion) => suggestion !== previewSuggestion));
      setPreviewSuggestion(null);
      setSummaryOpen(true);
    }
  };

  const handleIgnoreSuggestion = (suggestion: AIAssistantSuggestion) => {
    setAssistantSuggestions((current) => current.filter((item) => item !== suggestion));
    setExplainHint(null);
  };

  const handleExplainSuggestion = (suggestion: AIAssistantSuggestion) => {
    setExplainHint(suggestion.reason);
  };

  const handleClosePreview = () => {
    setPreviewSuggestion(null);
    setPreviewAllSuggestions([]);
  };

  const handleCloseSummary = () => {
    setSummaryOpen(false);
    setShowAssistant(true);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 animate-in fade-in zoom-in-95 duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={onReset} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Evaluation
          </button>
          <h1 className="text-3xl font-bold tracking-tight">Model Card & Governance</h1>
          <p className="text-neutral-400">Comprehensive AI risk assessment and documentation</p>
        </div>
        <div className="flex items-center gap-3">
          {provider && (
            <div className="px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900 text-xs font-medium text-neutral-400">
              Provider: <span className={provider === 'groq' ? 'text-white' : 'text-blue-400'}>{provider.toUpperCase()}</span>
            </div>
          )}
          <button onClick={handleExportJSON} className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors">
            <FileJson className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {/* Hero Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Identity */}
        <div className="lg:col-span-2 p-6 bg-neutral-900/50 border border-neutral-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">{draftData.model_name} <span className="text-neutral-500 text-lg">v{draftData.version}</span></h2>
            <p className="text-neutral-300 mb-6 leading-relaxed">{draftData.executive_summary || draftData.overview || draftData.experiment_info}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-neutral-500 uppercase font-semibold">Dataset</span>
                <span className="text-sm font-medium truncate" title={draftData.dataset}>{draftData.dataset}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-neutral-500 uppercase font-semibold">Risk Level</span>
                <span className={cn("text-sm font-bold uppercase", riskLevelClass)}>{risk.level}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Readiness Score */}
        <div className={cn("p-6 border rounded-2xl flex flex-col items-center justify-center relative overflow-hidden",
            isApproved ? "bg-green-950/20 border-green-900/50" : 
            isRejected ? "bg-red-950/20 border-red-900/50" : "bg-yellow-950/20 border-yellow-900/50"
        )}>
          <h3 className="text-sm font-semibold uppercase tracking-wider mb-2 text-neutral-400">Readiness Score</h3>
          <div className="h-40 w-full relative -mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="100%" innerRadius="70%" outerRadius="100%" barSize={20} data={readinessData} startAngle={180} endAngle={0}>
                <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                <RadialBar 
                  background={{ fill: '#262626' }} 
                  dataKey="value" 
                  cornerRadius={10} 
                  fill={isApproved ? '#22c55e' : isRejected ? '#ef4444' : '#eab308'} 
                />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
              <span className="text-4xl font-extrabold">{readiness.score}</span>
              <span className={cn("text-sm font-bold", isApproved ? 'text-green-500' : isRejected ? 'text-red-500' : 'text-yellow-500')}>
                {readiness.decision}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk and Readiness Reasons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-orange-400" /> Risk Assessment
          </h3>
          <ul className="space-y-2">
            {riskReasons.length > 0 ? (
              riskReasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-neutral-300">
                  <span className="text-orange-500 mt-1">•</span> {r}
                </li>
              ))
            ) : (
              <li className="text-sm text-neutral-500">No specific risk flags raised.</li>
            )}
          </ul>
        </div>
        
        <div className="p-6 border border-neutral-800 bg-neutral-900/30 rounded-2xl">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-blue-400" /> Deployment Readiness
          </h3>
          <ul className="space-y-2">
            {readinessReasons.length > 0 ? (
              readinessReasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-sm text-neutral-300">
                  <span className="text-blue-500 mt-1">•</span> {r}
                </li>
              ))
            ) : (
              <li className="text-sm text-neutral-500">No specific readiness criteria matched.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Metrics Chart & Model Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 border border-neutral-800 bg-neutral-900/50 rounded-2xl">
          <h3 className="text-lg font-semibold mb-6">Performance Metrics</h3>
          {metricData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" stroke="#525252" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={80} stroke="#a3a3a3" fontSize={11} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                  <Tooltip cursor={{ fill: '#262626' }} contentStyle={{ backgroundColor: '#171717', border: '1px solid #404040', borderRadius: '8px' }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">No metrics available.</p>
          )}
        </div>
        
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <AIRecommendationBadge title="Training Details" fieldKey="training_details" currentValue={draftData.training_details || draftData.training_analysis || ''} onApply={handleAssistantApply}>
            <div className="p-5 border border-neutral-800 bg-neutral-900/30 rounded-xl">
              <h4 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Training Details</h4>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{draftData.training_details || draftData.training_analysis || 'Training details not available.'}</p>
            </div>
          </AIRecommendationBadge>
          <AIRecommendationBadge title="Architecture" fieldKey="architecture" currentValue={draftData.architecture || draftData.architecture_analysis || ''} onApply={handleAssistantApply}>
            <div className="p-5 border border-neutral-800 bg-neutral-900/30 rounded-xl">
              <h4 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Architecture</h4>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{draftData.architecture || draftData.architecture_analysis || 'Architecture details not available.'}</p>
            </div>
          </AIRecommendationBadge>
          <AIRecommendationBadge title="Dataset Description" fieldKey="dataset_description" currentValue={draftData.dataset_description || draftData.dataset_analysis || ''} onApply={handleAssistantApply}>
            <div className="p-5 border border-neutral-800 bg-neutral-900/30 rounded-xl">
              <h4 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Dataset Description</h4>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{draftData.dataset_description || draftData.dataset_analysis || 'Dataset details not available.'}</p>
            </div>
          </AIRecommendationBadge>
          <AIRecommendationBadge title="Security & Monitoring" fieldKey="security_analysis" currentValue={draftData.security_analysis || draftData.security_considerations || draftData.monitoring_strategy || draftData.monitoring || ''} onApply={handleAssistantApply}>
            <div className="p-5 border border-neutral-800 bg-neutral-900/30 rounded-xl">
              <h4 className="text-sm font-semibold uppercase text-neutral-500 mb-2">Security & Monitoring</h4>
              <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{draftData.security_analysis || draftData.security_considerations || draftData.monitoring_strategy || draftData.monitoring || 'Security and monitoring details are not yet populated.'}</p>
            </div>
          </AIRecommendationBadge>
        </div>
      </div>

      {showLoader ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
          <AIThinkingLoader label="Preparing your AI assistant context..." />
        </div>
      ) : null}

      <div className="flex justify-end">
        <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm text-neutral-400">
          <p className="font-medium text-white">AI guidance is embedded in the sections below so you can improve weak or incomplete content without leaving the workflow.</p>
        </div>
      </div>

      <AIChangePreview
        isOpen={Boolean(previewSuggestion) || previewAllSuggestions.length > 0}
        oldValue={previewSuggestion ? String(draftData[previewSuggestion.fieldKey] ?? '') : ''}
        newValue={previewSuggestion ? previewSuggestion.suggestion : `Apply ${previewAllSuggestions.length} AI-approved updates.`}
        onConfirm={handleConfirmPreview}
        onCancel={handleClosePreview}
      />

      <AIAutoFixSummary
        isOpen={summaryOpen}
        count={appliedCount}
        beforeScore={beforeScore}
        afterScore={afterScore}
        remainingIssues={Math.max(0, assistantSuggestions.length)}
        onReview={() => setSummaryOpen(false)}
        onApplyAll={handleApplyAll}
        onCancel={handleCloseSummary}
      />

      {explainHint ? (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-4 text-sm text-blue-100">
          {explainHint}
        </div>
      ) : null}

      {/* AI Deep Dive Sections */}
      <div className="space-y-6 border-t border-neutral-800 pt-8 mt-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-400" />
          <h2 className="text-2xl font-bold">Deep Analysis</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {summarySections.map((section) => (
            <div key={section.title} className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/25">
              <h4 className="text-lg font-semibold mb-2">{section.title}</h4>
              <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{section.body}</p>
            </div>
          ))}
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/25">
            <h4 className="text-lg font-semibold mb-2">Ethical Considerations</h4>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{draftData.ethical_analysis || draftData.ethical_considerations || 'No ethical assessment generated.'}</p>
          </div>
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/25">
            <h4 className="text-lg font-semibold mb-2">Bias & Fairness</h4>
            <p className="text-sm text-neutral-400 leading-relaxed whitespace-pre-wrap">{draftData.bias_analysis || draftData.fairness || 'No fairness assessment generated.'}</p>
          </div>
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/25">
            <h4 className="text-lg font-semibold mb-2">Limitations & Failure Cases</h4>
            <div className="text-sm text-neutral-400 leading-relaxed mb-3 whitespace-pre-wrap">{draftData.failure_cases}</div>
            <ul className="list-disc pl-5 text-sm text-neutral-400 space-y-1">
              {draftData.limitations?.map((l, i) => <li key={i}>{l}</li>)}
            </ul>
          </div>
          <div className="p-6 border border-neutral-800 rounded-xl bg-neutral-900/25">
            <h4 className="text-lg font-semibold mb-2">Recommendations & Evidence</h4>
            <ul className="list-disc pl-5 text-sm text-neutral-400 space-y-2">
              {recommendationItems.map((item, i) => <li key={`${item}-${i}`}>{item}</li>)}
              {evidenceItems.length === 0 && <li>No evidence items were provided.</li>}
            </ul>
          </div>
        </div>
      </div>
      
    </div>
  );
}
