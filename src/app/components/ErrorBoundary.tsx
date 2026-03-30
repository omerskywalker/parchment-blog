"use client";

import * as React from "react";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type State = { hasError: boolean; message: string };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return { hasError: true, message };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-medium text-red-200">Something went wrong.</p>
            <p className="mt-1 text-xs text-red-200/60">{this.state.message}</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
