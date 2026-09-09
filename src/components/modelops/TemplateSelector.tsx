'use client';

import React from 'react';
import { FileText, MessageSquare, Image as ImageIcon, Brain, ThumbsUp, Shield, Sparkles } from 'lucide-react';
import { ModelOpsInput } from '@/types/modelops';

export interface ModelTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  data: ModelOpsInput;
}

const EMPTY_MODEL_DRAFT: ModelOpsInput = {
  model_name: '', version: '', dataset: '', intended_use: '', metrics: {}, limitations: [], risks: [], tests: [], reproducibility: '',
};

export const MODEL_TEMPLATES: ModelTemplate[] = [
  {
    id: 'blank',
    name: 'Blank template',
    description: 'Start from scratch with an empty model card',
    icon: FileText,
    data: {
      model_name: '',
      version: 'v1.0.0',
      dataset: '',
      intended_use: '',
      limitations: '',
      risks: '',
      tests: '',
      reproducibility: '',
      metrics: {
        accuracy: 0.0,
      },
    },
  },
  {
    id: 'nlp-classifier',
    name: 'NLP classifier',
    description: 'Classification guidance scaffold; no evidence is pre-filled',
    icon: MessageSquare,
    data: {
      model_name: 'RoBERTa-Clinical-Notes-Classifier',
      version: 'v2.1.0',
      dataset: 'MIMIC-IV-Deidentified-Notes',
      intended_use: 'Automated ICD-10 diagnostic coding and priority flag triage on physician discharge summaries.',
      limitations: 'Limited efficacy on non-English transcripts and unstructured handwritten shorthand.',
      risks: 'Potential clinical false negatives on rare syndromic comorbidities; requires certified clinician oversight.',
      tests: '5-Fold Stratified CV (Passed 94.2%), Out-of-Distribution Cohort Robustness (Passed), Latency SLA P99 < 20ms.',
      reproducibility: 'Deterministic PyTorch 2.4.0 environment. Seed 42. Checkpoint SHA256: 9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c.',
      metrics: {
        accuracy: 0.942,
        f1_score: 0.938,
        latency_ms: 12.4,
      },
    },
  },
  {
    id: 'image-classifier',
    name: 'Image classifier',
    description: 'Vision-model guidance scaffold; no evidence is pre-filled',
    icon: ImageIcon,
    data: {
      model_name: 'ResNet50-Radiology-Scan-Triage',
      version: 'v1.0.0',
      dataset: 'NIH-ChestX-ray14-Curated-Val',
      intended_use: 'Baseline automated medical image triage for emergency room chest X-ray prioritizations.',
      limitations: 'Performance degrades under high sensor artifact noise and edge-case pediatric anatomies.',
      risks: 'False reassurance on borderline pneumothorax scans; strictly auxiliary second-opinion usage.',
      tests: 'Cross-Validation 5-Fold (Passed), Latency SLA Benchmark (Passed), Bias Parity across Demographic Subgroups.',
      reproducibility: 'Deterministic TorchVision seed 100. sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b.',
      metrics: {
        accuracy: 0.885,
        f1_score: 0.862,
        latency_ms: 18.5,
      },
    },
  },
  {
    id: 'llm',
    name: 'Large language model',
    description: 'Generative-AI guidance scaffold; no evidence is pre-filled',
    icon: Brain,
    data: {
      model_name: 'LLaMA-3-8B-Governance-Assistant',
      version: 'v3.0.1-Instruct',
      dataset: 'Open-Orca-Filtered + EU-AI-Act-Statutory-Corpus',
      intended_use: 'Internal automated compliance clause extraction, regulatory summarization, and audit drafting.',
      limitations: 'May generate plausible-sounding hallucinated legal precedents if prompted outside bounded context.',
      risks: 'Confabulation on jurisdiction-specific regulatory nuances and unauthorized disclosure of prompt context.',
      tests: 'Toxicity Benchmarks < 0.1%, Factuality MMLU 78.4%, Prompt Injection Jailbreak Resilience Suite (99.1%).',
      reproducibility: 'vLLM 0.6.2 FP16 precision. Temperature 0.0 deterministic seed. Weights SHA256: 4f3e2d1c0b9a8f7e.',
      metrics: {
        accuracy: 0.892,
        hallucination_rate: 0.028,
        latency_ms: 45.0,
      },
    },
  },
  {
    id: 'recommendation',
    name: 'Recommendation system',
    description: 'Ranking-model guidance scaffold; no evidence is pre-filled',
    icon: ThumbsUp,
    data: {
      model_name: 'Two-Tower-Candidate-Retrieval-Engine',
      version: 'v4.2.0',
      dataset: 'Enterprise-Search-Clickstream-Q3',
      intended_use: 'Real-time candidate generation and semantic relevance scoring for corporate knowledge discovery.',
      limitations: 'Cold-start latency for freshly indexed technical repositories with zero interaction logs.',
      risks: 'Popularity feedback loop bias and potential visibility cannibalization of niche internal tooling.',
      tests: 'Offline NDCG@10 Backtest, Load Test 2,500 QPS, Live Canary Drift Evaluation (Passed).',
      reproducibility: 'TensorFlow Recommenders v0.7.3. Exact graph hash: a1b2c3d4e5f60718293a4b5c6d7e8f90.',
      metrics: {
        accuracy: 0.845,
        f1_score: 0.812,
        latency_ms: 6.8,
      },
    },
  },
  {
    id: 'fraud-detection',
    name: 'Fraud detection',
    description: 'Risk-model guidance scaffold; no evidence is pre-filled',
    icon: Shield,
    data: {
      model_name: 'XGBoost-Realtime-Card-Fraud-Detector',
      version: 'v5.1.2',
      dataset: 'PCI-DSS-Tokenized-Transaction-Logs',
      intended_use: 'Sub-10ms risk tier scoring for high-velocity payment authorization pipelines.',
      limitations: 'Higher false positive rates on international cross-border seasonal holiday purchases.',
      risks: 'Unwarranted account freezes causing friction for legitimate enterprise cardholders.',
      tests: 'Simulated Adversarial Replay (Passed), Real-time Latency P99.9 < 8ms, Population Stability Index < 0.05.',
      reproducibility: 'XGBoost 2.1.1 deterministic booster config. Checkpoint SHA256: 7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a.',
      metrics: {
        accuracy: 0.965,
        f1_score: 0.912,
        latency_ms: 4.2,
      },
    },
  },
].map((template) => ({
  ...template,
  // An archetype chooses guidance only. It must never silently become evidence.
  data: { ...EMPTY_MODEL_DRAFT },
}));

interface TemplateSelectorProps {
  activeTemplateId?: string;
  onSelectTemplate: (template: ModelTemplate) => void;
}

export default function TemplateSelector({
  activeTemplateId,
  onSelectTemplate,
}: TemplateSelectorProps) {
  return (
    <div className="mb-10">
      {/* Hero Heading Container */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 text-[#13715B] text-xs font-medium mb-3 rounded-md shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#13715B]" />
          <span>AI Governance & Readiness Engine</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          Model card generator
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
          Create standardized, production-grade model documentation following Google and Microsoft formats. Fill out the parameters below or choose a template to compute deterministic readiness scores and synthesize audit-ready model cards.
        </p>
      </div>

      {/* Template Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
          Choose a template
        </h2>
        <span className="text-xs text-gray-500">6 pre-configured ML archetypes</span>
      </div>

      {/* 6-Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {MODEL_TEMPLATES.map((template) => {
          const Icon = template.icon;
          const isSelected = activeTemplateId === template.id;

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              className={`p-4 bg-white border text-left transition-all group flex flex-col justify-between cursor-pointer rounded-md ${
                isSelected
                  ? 'border-[#13715B] ring-1 ring-[#13715B] shadow-sm bg-emerald-50/20'
                  : 'border-gray-300 hover:border-[#13715B] hover:shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 shrink-0 border flex items-center justify-center rounded transition-colors ${
                    isSelected
                      ? 'border-[#13715B] bg-emerald-50 text-[#13715B]'
                      : 'border-gray-300 text-gray-600 group-hover:border-[#13715B] group-hover:bg-emerald-50 group-hover:text-[#13715B]'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3
                      className={`font-semibold text-sm transition-colors ${
                        isSelected
                          ? 'text-[#13715B]'
                          : 'text-gray-900 group-hover:text-[#13715B]'
                      }`}
                    >
                      {template.name}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
