import React from 'react';

/**
 * Skeleton Loader for InputForm
 */
export const InputFormSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Loading experiment input form placeholder"
    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-pulse"
  >
    <div className="space-y-2 border-b border-slate-800 pb-4">
      <div className="h-5 w-48 bg-slate-800 rounded-md" />
      <div className="h-3 w-72 bg-slate-800/60 rounded-md" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <div className="h-3 w-28 bg-slate-800 rounded-md" />
        <div className="h-10 w-full bg-slate-950 rounded-lg border border-slate-800/80" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-24 bg-slate-800 rounded-md" />
        <div className="h-10 w-full bg-slate-950 rounded-lg border border-slate-800/80" />
      </div>
    </div>

    <div className="space-y-2">
      <div className="h-3 w-32 bg-slate-800 rounded-md" />
      <div className="h-10 w-full bg-slate-950 rounded-lg border border-slate-800/80" />
    </div>

    <div className="space-y-3">
      <div className="h-3 w-40 bg-slate-800 rounded-md" />
      <div className="flex gap-3">
        <div className="h-9 flex-1 bg-slate-950 rounded-lg border border-slate-800/80" />
        <div className="h-9 flex-1 bg-slate-950 rounded-lg border border-slate-800/80" />
      </div>
    </div>

    <div className="space-y-2">
      <div className="h-3 w-36 bg-slate-800 rounded-md" />
      <div className="h-20 w-full bg-slate-950 rounded-lg border border-slate-800/80" />
    </div>

    <div className="h-11 w-full bg-slate-800 rounded-xl" />
  </div>
);

/**
 * Skeleton Loader for ReadinessScore
 */
export const ReadinessScoreSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Loading readiness score gauge placeholder"
    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 animate-pulse"
  >
    <div className="flex justify-between items-center">
      <div className="h-4 w-44 bg-slate-800 rounded-md" />
      <div className="h-6 w-36 bg-slate-800 rounded-full" />
    </div>

    <div className="space-y-2">
      <div className="h-10 w-32 bg-slate-800 rounded-md" />
      <div className="h-3 w-full bg-slate-950 rounded-full border border-slate-800" />
    </div>

    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
      <div className="h-4 w-48 bg-slate-800 rounded-md" />
      <div className="h-3 w-3/4 bg-slate-800/60 rounded-md" />
    </div>
  </div>
);

/**
 * Skeleton Loader for EvidencePanel
 */
export const EvidencePanelSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Loading evidence engine placeholder"
    className="p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 shadow-xl space-y-6 animate-pulse"
  >
    <div className="flex justify-between items-center border-b border-indigo-500/10 pb-4">
      <div className="h-4 w-52 bg-indigo-900/40 rounded-md" />
      <div className="h-6 w-28 bg-indigo-900/40 rounded-full" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-3">
        <div className="h-4 w-40 bg-indigo-900/40 rounded-md" />
        <div className="h-12 w-full bg-slate-950 rounded-xl" />
        <div className="h-12 w-full bg-slate-950 rounded-xl" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-40 bg-indigo-900/40 rounded-md" />
        <div className="h-12 w-full bg-slate-950 rounded-xl" />
        <div className="h-12 w-full bg-slate-950 rounded-xl" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton Loader for RunComparison
 */
export const RunComparisonSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Loading run comparison placeholder"
    className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6 animate-pulse"
  >
    <div className="flex justify-between items-center border-b border-slate-800 pb-4">
      <div className="h-6 w-56 bg-slate-800 rounded-md" />
      <div className="h-8 w-24 bg-slate-800 rounded-lg" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-28 bg-slate-950 rounded-xl border border-slate-800" />
      <div className="h-28 bg-slate-950 rounded-xl border border-slate-800" />
    </div>

    <div className="h-24 bg-slate-950 rounded-xl border border-slate-800" />
  </div>
);

/**
 * Composite Skeleton Loader for ResultView
 */
export const ResultViewSkeleton: React.FC = () => (
  <div
    role="status"
    aria-label="Loading structured result view placeholder"
    className="space-y-6 animate-pulse"
  >
    {/* Identity Banner */}
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div className="h-7 w-56 bg-slate-800 rounded-md" />
        <div className="h-6 w-24 bg-slate-800 rounded-lg" />
      </div>
      <div className="h-12 w-full bg-slate-950 rounded-xl border border-slate-800" />
    </div>

    {/* Readiness Score Skeleton */}
    <ReadinessScoreSkeleton />

    {/* Metrics Grid Skeleton */}
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="h-4 w-48 bg-slate-800 rounded-md" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="h-16 bg-slate-950 rounded-xl border border-slate-800" />
        <div className="h-16 bg-slate-950 rounded-xl border border-slate-800" />
        <div className="h-16 bg-slate-950 rounded-xl border border-slate-800" />
      </div>
    </div>

    {/* Evidence Panel Skeleton */}
    <EvidencePanelSkeleton />
  </div>
);

export default ResultViewSkeleton;
