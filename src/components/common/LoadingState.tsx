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
      className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-white border border-gray-300 rounded-md shadow-xs animate-fadeIn text-gray-900"
    >
      <div className="relative flex items-center justify-center mb-6">
        <div className="w-14 h-14 border-4 border-emerald-100 border-t-[#13715B] rounded-full animate-spin"></div>
        <div className="absolute w-2.5 h-2.5 bg-[#13715B] rounded-full animate-ping"></div>
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-1.5 tracking-tight">
        {message}
      </h3>
      
      {subtext && (
        <p className="text-xs text-gray-500 max-w-md leading-relaxed">
          {subtext}
        </p>
      )}

      <div className="mt-6 flex items-center space-x-2 text-xs text-[#13715B] bg-emerald-50 px-3 py-1.5 rounded border border-emerald-200 font-semibold font-mono">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>ModelOps Evaluation Pipeline Active</span>
      </div>
    </div>
  );
}
