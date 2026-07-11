import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { RagQueryResponse } from "../types";

export default function SimilarCallsPage() {
  const [query, setQuery] = useState("Customer wants to reschedule an appointment and has insurance questions");
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.searchSimilarCalls(query);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed — make sure Talksmith is connected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Find Similar Calls</h2>
          <p>Describe your situation and see how other agents handled something like it.</p>
        </div>
      </header>

      <section className="split-layout">
        <form className="panel analyze-form" onSubmit={handleSearch}>
          <h3>Describe the call</h3>
          <p className="panel-desc">A few words is enough — we'll find matching conversations from the library.</p>
          <textarea
            rows={5}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            minLength={3}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Find similar calls"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <article className="panel">
          <h3>Matching conversations</h3>
          {!result ? (
            <div className="page-state">Enter a description to find real examples from the call library.</div>
          ) : result.sources.length === 0 ? (
            <div className="page-state">No matches yet. Try loading the call library from the Overview page first.</div>
          ) : (
            <div className="analysis-result">
              {result.sources.map((source) => (
                <div key={source.chunk_id} className="source-card">
                  {source.metadata?.industry ? (
                    <span className="tag">{String(source.metadata.industry)}</span>
                  ) : null}
                  <p>{source.text}</p>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
