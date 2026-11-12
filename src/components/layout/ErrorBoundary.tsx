import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/common/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div role="alert" className="max-w-md w-full bg-white rounded-lg border border-slate-200 p-8">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-600" strokeWidth={1.5} aria-hidden="true" />
            <h1 className="text-xl font-semibold text-slate-900">Something went wrong</h1>
            <p className="text-sm text-slate-600 mt-2">
              This page hit an unexpected error. Reload to try again. If it keeps happening, tell your admin what you were doing.
            </p>
            {this.state.error && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg text-left text-xs font-mono text-slate-700 overflow-x-auto border border-slate-200">
                {this.state.error.message}
              </div>
            )}
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = '/')}
                leftIcon={<Home className="w-4 h-4" />}
              >
                Go home
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={this.handleReset}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Reload page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
