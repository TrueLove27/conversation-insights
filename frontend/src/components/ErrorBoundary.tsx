import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || "Something went wrong" };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Talksmith UI error:", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary">
          <div className="alert-banner alert-danger">
            <strong>Something broke on this page</strong>
            <p>{this.state.message}</p>
          </div>
          <button type="button" onClick={this.handleRetry}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
