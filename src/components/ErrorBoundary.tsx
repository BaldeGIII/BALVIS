import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="app-shell flex min-h-screen items-center justify-center px-4 text-[color:var(--text)]">
          <div className="panel-surface relative z-10 max-w-md rounded-[28px] p-8 text-center">
            <h2 className="headline-display mb-3 text-2xl font-semibold text-[color:var(--warm)]">
              Something went wrong
            </h2>
            <p className="mb-6 text-[color:var(--muted)]">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button onClick={() => window.location.reload()} className="hud-button h-11">
              Reload BALVIS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
