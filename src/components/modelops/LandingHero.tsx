'use client';

import React from 'react';
import { ModelTemplate, MODEL_TEMPLATES } from './TemplateSelector';
import { Sparkles } from 'lucide-react';

interface LandingHeroProps {
  activeTemplateId: string | null;
  onSelectTemplate: (template: ModelTemplate) => void;
}

export default function LandingHero({ activeTemplateId, onSelectTemplate }: LandingHeroProps) {
  return (
    <section id="templates" className="text-center mb-10 animate-fadeIn scroll-mt-20">
      {/* 1. Pill Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 border border-green-200 text-[#13715B] text-xs font-semibold rounded-md mb-4 shadow-2xs">
        <Sparkles className="h-3.5 w-3.5 text-[#13715B]" />
        <span>Free AI Governance Tool</span>
      </div>

      {/* 2. Main Heading & Subtitle */}
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
        Model card generator
      </h1>
      <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed mb-8">
        Create standardized model documentation following Google and Microsoft formats. Choose a template below to open the generator, compute deterministic readiness scores, and get a professional model card ready for stakeholders.
      </p>

      {/* 3. 6 Interactive Template Cards */}
      <div className="text-left mb-8">
        <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 font-mono">
          Choose a template
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODEL_TEMPLATES.map((tpl) => {
            const isSelected = activeTemplateId === tpl.id;
            const Icon = tpl.icon;

            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className={`p-4 bg-white border text-left transition-all group rounded-md cursor-pointer ${
                  isSelected
                    ? 'border-[#13715B] ring-1 ring-[#13715B] shadow-xs bg-emerald-50/20'
                    : 'border-gray-300 hover:border-[#13715B] hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 border rounded flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-[#13715B] bg-green-50 text-[#13715B]'
                        : 'border-gray-300 group-hover:border-[#13715B] group-hover:bg-green-50 text-gray-600 group-hover:text-[#13715B]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-semibold text-sm mb-0.5 transition-colors ${
                          isSelected ? 'text-[#13715B]' : 'text-gray-900 group-hover:text-[#13715B]'
                        }`}
                      >
                        {tpl.name}
                      </h3>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#13715B]" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
