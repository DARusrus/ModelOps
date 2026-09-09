'use client';

import { ModelCardOutput } from '@/types/modelops';
import { History, Database } from 'lucide-react';

export default function ReadinessTimeline({ currentCard }: { currentCard: ModelCardOutput; templateId?: string | null }) {
  return (
    <section className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-4 text-gray-900">
      <div className="flex items-center gap-2"><History className="w-5 h-5 text-[#13715B]" /><div><p className="text-[11px] uppercase tracking-wider font-mono text-[#13715B]">Persisted history only</p><h3 className="text-xl font-bold">Readiness history</h3></div></div>
      <div className="p-5 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700 space-y-2"><Database className="w-5 h-5 text-gray-500" /><p>This release does not render synthetic releases or inferred trends. The current saved evaluation is shown below; a multi-record view will be enabled only from authorized persisted history.</p><dl className="grid sm:grid-cols-3 gap-3 text-xs font-mono"><div><dt className="text-gray-500">Model</dt><dd className="font-bold">{currentCard.model_name}</dd></div><div><dt className="text-gray-500">Version</dt><dd className="font-bold">{currentCard.version}</dd></div><div><dt className="text-gray-500">Readiness</dt><dd className="font-bold">{currentCard.readiness_score}/100</dd></div></dl></div>
    </section>
  );
}
