import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Evaluating model artifacts & generating structured model card...',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center p-8 my-6 rounded-xl border border-blue-500/20 bg-slate-900/60 backdrop-blur-md shadow-lg transition-all"
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute w-12 h-12 rounded-full border-2 border-blue-500/20 animate-ping" />
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-200 text-center tracking-wide">
        {message}
      </p>
      <p className="text-xs text-slate-400 text-center mt-1">
        Executing model readiness scoring & evidence pipeline...
      </p>
    </div>
  );
};

export default LoadingState;
