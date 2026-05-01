import { Component } from "react";
import { AlertTriangle } from "lucide-react";

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card trade-error-card">
          <AlertTriangle size={18} className="red-text" />
          <p className="trade-error-msg">
            This trade card couldn't render — the data may be missing a required field.
          </p>
          <button className="trade-error-retry" onClick={() => this.setState({ error: null })}>
            Dismiss
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
