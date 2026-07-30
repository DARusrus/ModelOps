'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error telemetry safely without exposing to user UI
    console.error('[ErrorBoundary] Caught unhandled React rendering exception:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnHome = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.href = '/modelops';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-[400px] p-8 my-6 rounded-2xl bg-slate-900 border border-red-500/30 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center text-center space-y-6"
        >
          <div className="p-4 rounded-2xl bg-red-950/60 border border-red-800/50 text-red-400">
            <AlertOctagon className="w-10 h-10" />
          </div>

          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-bold text-slate-100">
              {this.props.fallbackTitle || 'Unexpected System Interface Error'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {this.props.fallbackMessage ||
                'An isolated component rendering exception occurred. The error details have been logged for diagnosis.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 text-white text-xs font-semibold shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Component Render
            </button>

            <button
              type="button"
              onClick={this.handleReturnHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 text-xs font-semibold border border-slate-700 shadow transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
            >
              <Home className="w-4 h-4 text-blue-400" />
              Return to Portal Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
