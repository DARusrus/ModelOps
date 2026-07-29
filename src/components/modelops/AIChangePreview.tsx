'use client';

import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, X } from 'lucide-react';

interface AIChangePreviewProps {
  isOpen: boolean;
  oldValue: string;
  newValue: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AIChangePreview({ isOpen, oldValue, newValue, onConfirm, onCancel }: AIChangePreviewProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/75 p-4 backdrop-blur-sm">
        <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }} className="w-full max-w-3xl rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl shadow-black/40">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">Confirm AI suggestion</h3>
              <p className="mt-1 text-sm text-neutral-400">Review the proposed change before it updates the selected field.</p>
            </div>
            <button type="button" onClick={onCancel} className="rounded-full border border-neutral-700 p-2 text-neutral-400 transition hover:text-white" aria-label="Cancel preview">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Current value</div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-neutral-300">{oldValue || 'No value yet.'}</p>
            </div>
            <div className="flex items-center justify-center text-blue-400">
              <ArrowRight className="h-6 w-6" />
            </div>
            <div className="rounded-2xl border border-blue-500/20 bg-blue-600/10 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">AI proposed value</div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-blue-100">{newValue}</p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition hover:bg-neutral-800">Cancel</button>
            <button type="button" onClick={onConfirm} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500">
              <CheckCircle2 className="h-4 w-4" /> Confirm Update
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
