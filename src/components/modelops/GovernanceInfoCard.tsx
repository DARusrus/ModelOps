'use client';

import React from 'react';
import { BookOpen, ExternalLink, ShieldCheck, Scale, FileCode2 } from 'lucide-react';

export default function GovernanceInfoCard() {
  return (
    <div id="spec" className="mt-12 bg-gray-50 border border-gray-300 p-6 rounded-md scroll-mt-20">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded bg-white border border-gray-300 flex items-center justify-center text-[#13715B] shrink-0 shadow-2xs">
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-900 mb-1.5 flex items-center gap-2">
            What is a Model Card?
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-50 text-[#13715B] border border-emerald-200 rounded">
              Standardized Reporting
            </span>
          </h3>
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            Model cards are standardized technical dossiers providing transparency, reproducibility parameters, quantitative evaluations, limitations, and ethical considerations for production machine learning models. First introduced by Google Research in 2019, they are now standard for EU AI Act compliance, NIST AI RMF auditing, and enterprise model governance.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-gray-700 pt-1">
            <a
              href="https://arxiv.org/abs/1810.03993"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-gray-900 underline underline-offset-4 hover:text-[#13715B] transition-colors"
            >
              Read Mitchell et al. (2019) Paper
              <ExternalLink className="w-3 h-3" />
            </a>

            <span className="text-gray-300">|</span>

            <div className="flex items-center gap-1 text-gray-600">
              <ShieldCheck className="w-3.5 h-3.5 text-[#13715B]" />
              EU AI Act Article 13 Compliant
            </div>

            <span className="text-gray-300">|</span>

            <div className="flex items-center gap-1 text-gray-600">
              <Scale className="w-3.5 h-3.5 text-[#13715B]" />
              Deterministic 5-Category Scoring
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
