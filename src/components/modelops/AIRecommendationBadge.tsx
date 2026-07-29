'use client';

import React, { useMemo, useState, type ReactNode } from 'react';
import { Sparkles, X, Copy, RotateCw, Wand2, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIRecommendationBadgeProps {
  title: string;
  fieldKey: string;
  currentValue: string;
  onApply: (fieldKey: string, value: string) => void;
  children: ReactNode;
}

export function AIRecommendationBadge({ title, fieldKey, currentValue, onApply, children }: AIRecommendationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [applied, setApplied] = useState(false);

  const isEmpty = useMemo(() => !String(currentValue || '').trim(), [currentValue]);

  const handleOpen = async () => {
    setIsOpen(true);
    if (suggestion) {
      return;
    }

    setIsLoading(true);
    setMessage('Analyzing your model...');

    try {
      const response = await fetch('/api/modelops/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'card',
          context: { fieldKey, title, currentValue },
          history: [],
        }),
      });

      const data = await response.json();
      setSuggestion(data.suggestions?.[0]?.value || data.message || 'Add clearer governance context and evidence.');
      setConfidence(Math.round((data.suggestions?.[0]?.confidence || 0.9) * 100));
      setMessage(data.message || 'I found an opportunity to improve this section.');
    } catch {
      setSuggestion('Expand this section with clearer context, governance evidence, and practical deployment guidance.');
      setConfidence(88);
      setMessage('I found an opportunity to improve this section.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!suggestion) {
      return;
    }
    onApply(fieldKey, suggestion);
    setApplied(true);
    window.setTimeout(() => setApplied(false), 2200);
  };

  const handleCopy = async () => {
    if (!suggestion) {
      return;
    }
    await navigator.clipboard.writeText(suggestion);
  };

  const handleClose = () => setIsOpen(false);

  return (
    <div className="relative">
      <div className={cn('rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 transition-all', isEmpty && 'border-yellow-500/40 shadow-[0_0_0_1px_rgba(250,204,21,0.15),0_0_30px_rgba(59,130,246,0.08)]')}>
        <button
          type="button"
          aria-label={`AI Recommendation for ${title}`}
          onClick={handleOpen}
          className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-200 transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          ✨ AI Recommendation
        </button>
        {children}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl shadow-black/50">
            <button type="button" onClick={handleClose} className="absolute right-4 top-4 rounded-full border border-neutral-700 p-2 text-neutral-400 transition hover:bg-neutral-800" aria-label="Close assistant dialog">
              <X className="h-4 w-4" />
            </button>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-sm font-medium text-blue-200">
                <Sparkles className="h-4 w-4" /> AI Assistant
              </div>
              <h3 className="mt-3 text-xl font-semibold text-white">I found an opportunity to improve this section.</h3>
              <p className="mt-2 text-sm text-neutral-400">{title} is missing or too weak. This reduces documentation quality and governance readiness.</p>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Suggested Improvement</p>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{confidence}% confidence</span>
              </div>
              {isLoading ? (
                <div className="space-y-2 text-sm text-neutral-300">
                  <p>Analyzing your model...</p>
                  <p>Searching governance evidence...</p>
                  <p>Preparing recommendations...</p>
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-7 text-neutral-200">{suggestion || message}</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" onClick={handleApply} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500">
                <Wand2 className="h-4 w-4" /> Apply Suggestion
              </button>
              <button type="button" onClick={handleCopy} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800">
                <Copy className="h-4 w-4" /> Copy
              </button>
              <button type="button" onClick={() => setSuggestion(null)} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800">
                <RotateCw className="h-4 w-4" /> Regenerate
              </button>
              <button type="button" onClick={handleClose} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800">
                Cancel
              </button>
            </div>

            {applied ? (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                <CheckCircle2 className="h-4 w-4" /> Updated by AI Assistant
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
