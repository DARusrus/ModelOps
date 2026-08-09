import React from 'react';

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
      className="p-6 bg-red-950/40 border border-red-800/60 rounded-xl shadow-xl backdrop-blur animate-fade-in text-slate-100"
    >
      <div className="flex items-start space-x-4">
        <div className="p-3 bg-red-900/50 rounded-lg border border-red-700/50 text-red-400 shrink-0">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-red-200 tracking-wide mb-1">
            {title}
          </h3>
          <p className="text-sm text-red-300/90 leading-relaxed mb-3">
            {message}
          </p>

          {details && details.length > 0 && (
            <div className="mt-3 p-3 bg-red-950/80 border border-red-900 rounded-lg text-xs font-mono text-red-300">
              <p className="font-semibold text-red-400 mb-1">Validation Errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {details.map((d, index) => (
                  <li key={index}>
                    <span className="font-bold text-red-200">{d.path}:</span> {d.message}
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
                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-lg shadow-md hover:shadow-red-600/30 transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{retryLabel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
