import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { captureException } from "@/lib/observability";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Top-level render-error boundary — Phase 8.1 Epic 3 (ADR 0003 §6).
 *
 * On a render-time failure, shows only a minimal, neutral fallback message
 * with a Reload button — never stack traces, error messages, identifiers,
 * or other technical details. Reports the exception via
 * `src/lib/observability.ts`, which itself no-ops when Sentry is disabled.
 * Normal rendering behavior (no error) is unchanged: children are rendered
 * exactly as passed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_error: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    captureException(error);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <p className="text-base text-foreground">
            Something went wrong. Reload the page to continue.
          </p>
          <Button onClick={this.handleReload}>Reload</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
