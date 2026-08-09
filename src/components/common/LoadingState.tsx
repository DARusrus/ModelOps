import React from 'react';

interface LoadingStateProps {
  message?: string;
  subtext?: string;
}

export default function LoadingState({
  message = 'Evaluating model governance metadata and generating model card...',
  subtext = 'Calling server-side AI evaluation pipeline & computing deterministic readiness score.',
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-slate-900/60 backdrop-blur border border-slate-800 rounded-xl shadow-xl animate-fade-in"
    >
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="absolute w-10 h-10 border-4 border-purple-500/20 border-b-purple-400 rounded-full animate-spin-reverse"></div>
        <div className="absolute w-3 h-3 bg-indigo-400 rounded-full animate-ping"></div>
      </div>

      <h3 className="text-lg font-semibold text-slate-100 mb-2 tracking-wide">
        {message}
      </h3>
      
      {subtext && (
        <p className="text-sm text-slate-400 max-w-md">
          {subtext}
        </p>
      )}

      <div className="mt-6 flex items-center space-x-2 text-xs text-indigo-400 bg-indigo-950/40 px-3 py-1.5 rounded-full border border-indigo-800/50">
        <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
        <span>ModelOps Evaluation Pipeline Active</span>
      </div>
    </div>
  );
}
