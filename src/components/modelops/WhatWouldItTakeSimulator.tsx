'use client';

import React, { useState } from 'react';
import { ModelCardOutput, SimulatedGapItem } from '@/types/modelops';
import { identifyModelGaps, simulateScoreWithToggles } from '@/lib/modelops/simulator';
import { Zap, CheckCircle2, ArrowRight } from 'lucide-react';

interface WhatWouldItTakeSimulatorProps {
  currentCard: ModelCardOutput;
  onApplyFixes?: (simulatedCard: ModelCardOutput) => void;
}

export default function WhatWouldItTakeSimulator({
  currentCard,
  onApplyFixes,
}: WhatWouldItTakeSimulatorProps) {
  const gaps: SimulatedGapItem[] = identifyModelGaps(currentCard);
  const [selectedGaps, setSelectedGaps] = useState<string[]>([]);

  const toggleGap = (id: string) => {
    setSelectedGaps((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllGaps = () => {
    setSelectedGaps(gaps.map((g) => g.id));
  };

  const clearAllGaps = () => {
    setSelectedGaps([]);
  };

  const { simulatedScore, simulatedCard } = simulateScoreWithToggles(
    currentCard,
    selectedGaps
  );

  void onApplyFixes;
  void simulatedCard;

  const currentScore = currentCard.readiness_score || 0;

  return (
    <div className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Actionable Gap Intelligence
            </span>
            <span className="text-xs text-gray-500 font-mono">Planning checklist — not an evidence-based score forecast</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            “What Would It Take” Live Simulator
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {gaps.length > 0 && (
            <>
              <button
                type="button"
                onClick={selectAllGaps}
                className="px-2.5 py-1 text-xs font-semibold text-[#13715B] hover:bg-emerald-50 rounded border border-emerald-200 transition-colors cursor-pointer"
              >
                Simulate All Fixes
              </button>
              <button
                type="button"
                onClick={clearAllGaps}
                className="px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded border border-gray-200 transition-colors cursor-pointer"
              >
                Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Interactive Simulation Score Gauge Banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-50/60 via-emerald-50/30 to-amber-50/40 border border-emerald-200 rounded-md flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Score Shift Visualizer */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Current Score Pill */}
          <div className="text-center">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider font-mono mb-1">Current Score</div>
            <div className="w-16 h-16 rounded-full bg-white border border-gray-300 flex items-center justify-center font-bold text-xl text-gray-900 font-mono shadow-2xs">
              {currentScore}
            </div>
          </div>

          <ArrowRight className="w-6 h-6 text-[#13715B] shrink-0" />

          {/* Simulated Score Pill */}
          <div className="text-center">
            <div className="text-[11px] font-bold text-[#13715B] uppercase tracking-wider font-mono mb-1">Simulated Score</div>
            <div className="w-16 h-16 rounded-full bg-[#13715B] border border-[#0f5c49] text-white flex items-center justify-center font-bold text-xl font-mono shadow-xs transition-all">
              {simulatedScore}
            </div>
          </div>

          <div className="px-3 py-1 bg-white border border-amber-300 rounded font-mono font-bold text-xs text-amber-800 shadow-2xs">
            Re-evaluate after evidence is supplied
          </div>
        </div>

      </div>

      {/* Gap Toggles List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">
            Prospective Governance Fixes ({gaps.length} Gaps Detected)
          </h4>
          <span className="text-[11px] text-gray-500">Toggle switches to plan work; they do not create evidence</span>
        </div>

        {gaps.length === 0 ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded text-center text-xs text-gray-700 space-y-1">
            <CheckCircle2 className="w-6 h-6 text-[#13715B] mx-auto mb-2" />
            <div className="font-bold text-gray-900">Zero Governance Gaps Detected!</div>
            <p className="text-gray-600">No missing fields were detected by this checklist. It does not establish release readiness.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {gaps.map((gap) => {
              const isChecked = selectedGaps.includes(gap.id);

              return (
                <div
                  key={gap.id}
                  onClick={() => toggleGap(gap.id)}
                  className={`p-4 border rounded-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isChecked
                      ? 'border-[#13715B] bg-emerald-50/20 ring-1 ring-[#13715B]'
                      : 'border-gray-200 bg-gray-50/60 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleGap(gap.id)}
                        className="rounded border-gray-300 text-[#13715B] focus:ring-[#13715B] w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900">{gap.label}</span>
                        <span className="px-2 py-0.2 bg-white border border-gray-200 rounded text-[10px] font-mono uppercase text-gray-600">
                          {gap.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{gap.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="px-2.5 py-1 bg-white border border-emerald-300 text-[#13715B] rounded text-xs font-mono font-bold shadow-2xs">
                      +{gap.point_value} pts
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
