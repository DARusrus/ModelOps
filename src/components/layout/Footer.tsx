'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink, Award, CheckCircle2, Lock } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#FAFAFA] border-t border-gray-200 mt-20 text-gray-600 text-sm">
      {/* Top Certifications / Badges Bar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6 border-b border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-gray-800">ModelOps Governance Engine:</span>
            <span>Production v1.0.0 (Deterministic Scoring + AI Failover Gateway)</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
              <CheckCircle2 className="w-4 h-4 text-[#13715B]" />
              ISO/IEC 42001 Ready
            </div>
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Lock className="w-4 h-4 text-[#13715B]" />
              Zero PII Retention
            </div>
            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
              <Award className="w-4 h-4 text-[#13715B]" />
              NIST AI RMF 1.0 Aligned
            </div>
          </div>
        </div>
      </div>

      {/* 5-Column Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          
          {/* Column 1: Brand & Purpose */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[#13715B]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-900 text-base">ModelOps</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Open-source ML governance, automated model card synthesis, and deterministic readiness evaluations for enterprise AI systems.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors"
                aria-label="GitHub Repository"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </a>
            </div>
          </div>


          {/* Column 2: Platform */}
          <div>
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-[#13715B] transition-colors">
                  Model Card Studio
                </Link>
              </li>
              <li>
                <Link href="/#comparison-matrix" className="hover:text-[#13715B] transition-colors">
                  Model Comparison Matrix
                </Link>
              </li>
              <li>
                <Link href="/#readiness-rubric" className="hover:text-[#13715B] transition-colors">
                  Readiness Score Rubric
                </Link>
              </li>
              <li>
                <span className="text-gray-600">Model Inventory (Enterprise)</span>
              </li>
            </ul>
          </div>

          {/* Column 3: Governance & Specs */}
          <div>
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">
              Specifications
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://arxiv.org/abs/1810.03993"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#13715B] transition-colors flex items-center gap-1"
                >
                  Mitchell et al. (2019)
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.nist.gov/itl/ai-risk-management-framework"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#13715B] transition-colors flex items-center gap-1"
                >
                  NIST AI RMF 1.0
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                </a>
              </li>
              <li>
                <span className="text-gray-600">EU AI Act Statutory Rules</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Architecture */}
          <div>
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">
              Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-gray-600">Groq LLaMA-3.3-70B Primary</span>
              </li>
              <li>
                <span className="text-gray-600">Google Gemini 1.5 Fallback</span>
              </li>
              <li>
                <span className="text-gray-600">Offline Metadata Synthesis</span>
              </li>
              <li>
                <span className="text-gray-600">Shared database request controls</span>
              </li>
            </ul>
          </div>

          {/* Column 5: Team & Integrity */}
          <div>
            <h4 className="font-semibold text-gray-900 text-xs uppercase tracking-wider mb-3">
              Governance Team
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-gray-600">Ahmed — Architecture & Frontend</span>
              </li>
              <li>
                <span className="text-gray-600">Haneen — Providers & Engine</span>
              </li>
              <li>
                <span className="text-gray-600">Mohamed — Tools & Rubric Math</span>
              </li>
              <li>
                <span className="text-gray-600">Zein — QA, Benchmarks & E2E</span>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-200 bg-gray-50/50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2026 ModelOps — Built for Enterprise AI Governance & Model Reporting.</p>
          <div className="flex items-center gap-4">
            <span className="text-gray-800 font-medium">English</span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-600">Zero Commercial Copyright Claim</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
