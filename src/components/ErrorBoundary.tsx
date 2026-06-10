import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside Ledger Smart component tree:", error, errorInfo);
  }

  private handleReset = () => {
    (this as any).setState({ hasError: false, error: null });
    // Attempt dynamic reload of chunk or simple state resync
    window.location.reload();
  };

  public render() {
    const self = this as any;
    if (self.state.hasError) {
      if (self.props.fallback) {
        return self.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-red-200 dark:border-red-900/40 my-8">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-5">
              <AlertTriangle className="h-7 w-7" />
            </div>
            
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white tracking-tight">
              Component Decoupling Issue Detected
            </h3>
            
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Ledger Smart's secure routing system successfully sandboxed a component rendering issue before it could affect your security session.
            </p>

            {self.state.error && (
              <div className="mt-4 p-3 bg-red-50/50 dark:bg-red-950/20 rounded-lg text-left border border-red-100/50 dark:border-red-950/30">
                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-words font-medium">
                  {self.state.error.name}: {self.state.error.message}
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                id="error-boundary-refresh"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100 rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                Re-sync Workspace
              </button>
              
              <a
                href="mailto:support@ledgersmart.io"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100/80 dark:bg-slate-800/60 rounded-lg transition-all"
              >
                <HelpCircle className="h-4 w-4" />
                Support
              </a>
            </div>
          </div>
        </div>
      );
    }

    return self.props.children;
  }
}
