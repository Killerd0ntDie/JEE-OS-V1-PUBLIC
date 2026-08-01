import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    // Attempt recovery by reloading the window or resetting state
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-zinc-950/60 rounded-3xl border border-red-500/20 m-4 shadow-2xl backdrop-blur-xl">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
              <Icon name="AlertTriangle" className="w-8 h-8 text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-display font-black text-white">System Anomaly Detected</h2>
              <p className="text-sm text-zinc-400">
                The active module encountered a critical error. Your local data remains secure.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-black/40 rounded-xl border border-zinc-800/50 text-left overflow-hidden">
                <p className="text-xs font-mono text-red-400 truncate font-bold">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-zinc-200 text-black rounded-xl font-bold font-mono transition-colors"
            >
              <Icon name="RotateCcw" className="w-4 h-4" />
              <span>Reboot Module</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
