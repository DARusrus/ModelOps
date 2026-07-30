import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = 'An unexpected error occurred while processing the model evaluation request.',
  onRetry,
  title = 'Model Evaluation Error',
}) => {
  return (
    <div
      role="alert"
      className="p-6 my-6 rounded-xl border border-red-500/30 bg-red-950/40 backdrop-blur-md text-red-200 shadow-xl"
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-red-900/50 text-red-400 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-red-100">{title}</h3>
          <p className="mt-1 text-sm text-red-300 leading-relaxed">{message}</p>
          
          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Evaluation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
