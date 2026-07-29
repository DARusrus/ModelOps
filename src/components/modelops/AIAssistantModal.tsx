'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, Sparkles, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AIAssistantSuggestion } from '@/lib/modelops/ai-assistant';
import { cn } from '@/lib/utils';

interface AIAssistantModalProps {
  isOpen: boolean;
  title?: string;
  suggestions: AIAssistantSuggestion[];
  onClose: () => void;
  onApply: (suggestion: AIAssistantSuggestion) => void;
  onIgnore: (suggestion: AIAssistantSuggestion) => void;
  onExplain: (suggestion: AIAssistantSuggestion) => void;
  onApplyAll: () => void;
}

export function AIAssistantModal({
  isOpen,
  title = 'AI Assistant',
  suggestions,
  onClose,
  onApply,
  onIgnore,
  onExplain,
  onApplyAll,
}: AIAssistantModalProps) {
  const [openCard, setOpenCard] = useState<number | null>(0);
  const hasMultiple = suggestions.length > 1;
  const summaryLabel = useMemo(() => {
    if (suggestions.length === 0) return 'No suggestions available.';
    return `We found ${suggestions.length} issue${suggestions.length > 1 ? 's' : ''} that can be improved.`;
  }, [suggestions.length]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-4 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl shadow-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="flex items-start justify-between border-b border-neutral-800 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-white">{title}</h2>
                  <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-300">
                    AI Assistant
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-400">Actionable guidance for improving clarity, governance, and readiness.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="rounded-full border border-neutral-700 p-2 text-neutral-400 transition hover:text-white" aria-label="Close assistant">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-300">
                  <Sparkles className="h-4 w-4" />
                  Suggested improvements
                </div>
                <span className="text-sm text-neutral-400">{summaryLabel}</span>
              </div>
              {hasMultiple ? (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3">
                  <span className="text-sm font-medium text-white">AI Auto Fix</span>
                  <span className="text-sm text-neutral-400">Review and apply the approved changes in one pass.</span>
                  <button type="button" onClick={onApplyAll} className="ml-auto rounded-lg border border-blue-500/30 bg-blue-600/20 px-3 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-600/30">
                    Apply All
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-3">
              {suggestions.map((suggestion, index) => {
                const isOpen = openCard === index;
                return (
                  <div key={`${suggestion.fieldKey}-${index}`} className="rounded-2xl border border-neutral-800 bg-neutral-950/60">
                    <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left" onClick={() => setOpenCard(isOpen ? null : index)}>
                      <div>
                        <div className="text-sm font-semibold text-white">{suggestion.fieldName}</div>
                        <div className="mt-1 text-sm text-neutral-400">{suggestion.problem}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                        {isOpen ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
                      </div>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen ? (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-neutral-800 px-4 py-4">
                          <div className="space-y-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Why this is an issue</div>
                              <p className="mt-2 text-sm text-neutral-300">{suggestion.reason}</p>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">AI suggested improvement</div>
                              <p className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-sm text-neutral-200">{suggestion.suggestion}</p>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Expected impact</div>
                              <p className="mt-2 text-sm text-neutral-300">{suggestion.impact}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => onApply(suggestion)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
                                <CheckCircle2 className="h-4 w-4" /> Apply
                              </button>
                              <button type="button" onClick={() => onIgnore(suggestion)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">
                                Ignore
                              </button>
                              <button type="button" onClick={() => onExplain(suggestion)} className="rounded-lg border border-neutral-700 px-3 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">
                                Explain More
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-800 bg-neutral-950/70 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
