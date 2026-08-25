'use client';

import React, { useState } from 'react';
import { ShieldCheck, Cpu, Lock, HelpCircle, ChevronDown, CheckCircle2, FileText, ArrowRight, Activity } from 'lucide-react';

const FAQS = [
  {
    q: 'What is an AI Model Card?',
    a: 'Introduced by Google Research in 2019 (Mitchell et al.), model cards are structured, standardized documents that provide transparency into machine learning models. They document intended use cases, performance benchmarks across demographic slices, known limitations, and ethical considerations.',
  },
  {
    q: 'How is the Model Readiness Score calculated?',
    a: 'ModelOps computes a deterministic score (0–100) across 5 weighted governance categories: Model Identity (10%), Dataset & Preprocessing (15%), Metric Validation & SLA Benchmarks (25%), Operational Risks & Ethical Guardrails (25%), and Reproducibility Integrity (25%). Scores dynamically respond to metric performance thresholds, mitigation completeness, and seed validity.',
  },
  {
    q: 'How does the Bring-Your-Own-Key (BYOK) AI Engine work?',
    a: 'You can insert your personal Groq API key (for ultra-fast LLaMA-3 LPU inference) or Google Gemini API key via the settings menu. Keys are kept strictly in your local browser storage, sent via encrypted headers, and never stored on server disks. If no keys are provided, the app operates 100% free using its deterministic offline synthesizer.',
  },
  {
    q: 'Why is the Governance Decision always "Pending Human Review"?',
    a: 'In compliance with EU AI Act Article 14 (Human Oversight) and NIST AI RMF standards, automated AI systems cannot self-approve deployment into production. ModelOps enforces a strict human-in-the-loop invariant where automated pipelines provide evidence, while human governance officers retain sole sign-off authority.',
  },
  {
    q: 'Is my proprietary model data or dataset stored?',
    a: 'No. ModelOps operates under a zero-retention privacy architecture. Evaluation metadata is processed in-memory, cached ephemerally in an LRU buffer for duplicate requests, and never permanently stored or used to train third-party models.',
  },
];

export default function LandingFeatures() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div id="features" className="mt-16 pt-12 border-t border-gray-200 space-y-16 animate-fadeIn text-gray-900 scroll-mt-20">
      {/* 1. Core Architecture Pillars */}
      <div>
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">
            Why Enterprise Teams Use ModelOps
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Standardized compliance automation and deterministic verification for production AI systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-white border border-gray-300 rounded-md shadow-xs space-y-3">
            <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#13715B]">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Dynamic Deterministic Scoring</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Mathematical 5-category evaluation rubric evaluates quantitative metric performance, reproducibility seeds, and safety guardrails.
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-300 rounded-md shadow-xs space-y-3">
            <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#13715B]">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">BYOK AI Multi-Provider</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Bring your own Groq or Gemini API keys, or run completely offline with our deterministic zero-cloud synthesizer.
            </p>
          </div>

          <div className="p-6 bg-white border border-gray-300 rounded-md shadow-xs space-y-3">
            <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#13715B]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-gray-900">Human-in-the-Loop Gate</h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Enforces mandatory human governance review prior to release, preventing unmonitored autonomous model promotion.
            </p>
          </div>
        </div>
      </div>

      {/* 2. How It Works: 3 Steps */}
      <div className="bg-gray-50 border border-gray-200 rounded-md p-8 sm:p-10">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-1">
            How The Generator Works
          </h3>
          <p className="text-xs text-gray-600">
            From model specification to standardized compliance documentation in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="bg-white p-5 rounded border border-gray-300 shadow-2xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#13715B] text-white flex items-center justify-center font-bold text-xs font-mono">
              1
            </div>
            <h4 className="font-semibold text-sm text-gray-900">Select Template or Customize</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Pick a domain-specific ML benchmark template (NLP, Vision, LLM, RecSys, Fraud) or fill out the 9-section form.
            </p>
          </div>

          <div className="bg-white p-5 rounded border border-gray-300 shadow-2xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#13715B] text-white flex items-center justify-center font-bold text-xs font-mono">
              2
            </div>
            <h4 className="font-semibold text-sm text-gray-900">Automated Pipeline Evaluation</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              The engine validates metadata, calculates deterministic readiness indices, and synthesizes structured dossiers.
            </p>
          </div>

          <div className="bg-white p-5 rounded border border-gray-300 shadow-2xs space-y-2">
            <div className="w-7 h-7 rounded-full bg-[#13715B] text-white flex items-center justify-center font-bold text-xs font-mono">
              3
            </div>
            <h4 className="font-semibold text-sm text-gray-900">Export & Human Sign-off</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              Download JSON schemas, copy markdown reports, or compare candidate runs side-by-side with historical baselines.
            </p>
          </div>
        </div>
      </div>

      {/* 3. FAQ Accordion */}
      <div id="faq" className="max-w-3xl mx-auto space-y-4 scroll-mt-20">
        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center justify-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#13715B]" />
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white border border-gray-300 rounded-md overflow-hidden transition-all shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ml-2 ${
                      isOpen ? 'rotate-180 text-[#13715B]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs text-gray-600 leading-relaxed border-t border-gray-100 animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
