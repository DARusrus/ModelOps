'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, CheckCircle2, X } from 'lucide-react';

interface AIAutoFixSummaryProps {
  isOpen: boolean;
  count: number;
  beforeScore: number;
  afterScore: number;
  remainingIssues: number;
  onReview: () => void;
  onApplyAll: () => void;
  onCancel: () => void;
}

export function AIAutoFixSummary({ isOpen, count, beforeScore, afterScore, remainingIssues, onReview, onApplyAll, onCancel }: AIAutoFixSummaryProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[61] flex items-center justify-center bg-neutral-950/75 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }} className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">AI auto fix summary</h3>
                <p className="mt-1 text-sm text-neutral-400">We found {count} issue{count > 1 ? 's' : ''} that can be improved.</p>
              </div>
            </div>
            <button type="button" onClick={onCancel} className="rounded-full border border-neutral-700 p-2 text-neutral-400 transition hover:text-white" aria-label="Dismiss summary">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-300">
            Review the proposed updates, then apply them to the approved fields only.
          </div>
          <div className="mt-6 grid gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4 text-sm text-neutral-300 md:grid-cols-2">
            <div><span className="font-semibold text-white">Fields improved:</span> {count}</div>
            <div><span className="font-semibold text-white">Readiness before:</span> {beforeScore}</div>
            <div><span className="font-semibold text-white">Readiness after:</span> {afterScore}</div>
            <div><span className="font-semibold text-white">Remaining issues:</span> {remainingIssues}</div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">Close</button>
            <button type="button" onClick={onReview} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">Continue Editing</button>
            <button type="button" onClick={onApplyAll} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
              <CheckCircle2 className="h-4 w-4" /> Generate Model Card Again
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
