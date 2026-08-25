import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  details?: { path: string; message: string }[];
  onRetry?: () => void;
  retryLabel?: string;
}

export default function ErrorState({
  title = 'Evaluation Failed',
  message,
  details,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="p-6 bg-rose-50/80 border border-rose-200 rounded-md shadow-xs animate-fadeIn text-gray-900"
    >
      <div className="flex items-start space-x-3.5">
        <div className="p-2.5 bg-rose-100 rounded text-rose-700 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-rose-900 tracking-tight mb-1">
            {title}
          </h3>
          <p className="text-xs text-rose-800 leading-relaxed mb-3">
            {message}
          </p>

          {details && details.length > 0 && (
            <div className="mt-2.5 p-3 bg-white border border-rose-200 rounded text-xs font-mono text-rose-800 space-y-1">
              <p className="font-bold uppercase text-[10px] tracking-wider text-rose-600 mb-1">Validation Errors:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {details.map((detail, idx) => (
                  <li key={idx}>
                    <span className="font-semibold text-rose-900">{detail.path}:</span> {detail.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {retryLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
