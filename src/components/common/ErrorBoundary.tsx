'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorState from './ErrorState';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    Sentry.captureException(error, { contexts: { react: { component_stack: errorInfo.componentStack || undefined } } });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <ErrorState
            title={this.props.fallbackTitle || 'Component Error'}
            message={
              this.state.error?.message ||
              this.props.fallbackMessage ||
              'An unexpected error occurred while rendering.'
            }
            onRetry={this.handleRetry}
            retryLabel="Reload Component"
          />
        </div>
      );
    }

    return this.props.children;
  }
}
