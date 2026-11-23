import { Component } from 'react';
import { KEY } from '../lib/persistence.js';

// Catches rendering errors anywhere below it and shows a recovery screen instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('UI crashed:', error, info.componentStack); }
  resetData = () => {
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto mt-16 max-w-lg rounded-xl border border-danger bg-surface p-6 text-ink">
        <h1 className="mb-2 text-xl font-bold text-danger">Something went wrong</h1>
        <p className="mb-4 text-muted">The page hit an unexpected error. Your data is still saved. Try again, or reset the saved data if the problem continues.</p>
        <pre className="mb-4 overflow-auto rounded-lg bg-surface2 p-3 text-xs">{String(this.state.error.message || this.state.error)}</pre>
        <div className="flex gap-2">
          <button className="cursor-pointer rounded-[10px] border border-accent bg-accent px-3.5 py-2 font-semibold text-onaccent" onClick={() => this.setState({ error: null })}>Try again</button>
          <button className="cursor-pointer rounded-[10px] border border-line px-3.5 py-2 font-semibold" onClick={this.resetData}>Reset saved data</button>
        </div>
      </div>
    );
  }
}
