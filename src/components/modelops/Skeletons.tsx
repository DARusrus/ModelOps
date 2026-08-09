import React from 'react';

export function ResultViewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-6 bg-slate-900 border border-slate-800 rounded-2xl">
      <div className="h-8 bg-slate-800 rounded w-1/3 mb-4"></div>
      <div className="h-24 bg-slate-950 rounded-xl mb-4"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="h-16 bg-slate-950 rounded-xl"></div>
        <div className="h-16 bg-slate-950 rounded-xl"></div>
        <div className="h-16 bg-slate-950 rounded-xl"></div>
        <div className="h-16 bg-slate-950 rounded-xl"></div>
      </div>
      <div className="h-32 bg-slate-950 rounded-xl"></div>
    </div>
  );
}

export function RunComparisonSkeleton() {
  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse space-y-4">
      <div className="h-6 bg-slate-800 rounded w-1/4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-40 bg-slate-950 rounded-xl"></div>
        <div className="h-40 bg-slate-950 rounded-xl"></div>
      </div>
    </div>
  );
}
