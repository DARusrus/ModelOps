'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface AIThinkingLoaderProps {
  label?: string;
}

export function AIThinkingLoader({ label = 'Preparing AI suggestions...' }: AIThinkingLoaderProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-4 py-3 text-sm text-neutral-300">
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-400">
        <Sparkles className="h-5 w-5" />
        <motion.span className="absolute inset-0 rounded-full border border-blue-400/50" animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.05, 0.9] }} transition={{ duration: 1.4, repeat: Infinity }} />
      </div>
      <div>
        <div className="font-medium text-white">{label}</div>
        <div className="text-xs text-neutral-500">Reviewing documentation quality, consistency, and readiness signals.</div>
      </div>
    </div>
  );
}
