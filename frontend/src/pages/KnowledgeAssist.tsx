import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { RagQueryResponse } from "../types";

export default function KnowledgeAssistPage() {
  const [question, setQuestion] = useState("The customer says our price is too high. What should I say?");
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await api.askPlaybook(question);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get coaching tips");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Coaching Tips</h2>
          <p>Stuck on a call? Ask what to say — Talksmith searches proven playbooks and gives you plain advice.</p>
        </div>
      </header>

      <section className="split-layout">
        <form className="panel analyze-form" onSubmit={handleAsk}>
          <h3>What's the situation?</h3>
          <p className="panel-desc">Describe what the customer said or what you're unsure about.</p>
          <textarea
            rows={6}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
            minLength={3}
            placeholder="e.g. Customer wants a refund but policy says no…"
          />
          <button type="submit" disabled={loading}>
            {loading ? "Finding advice…" : "Get coaching tips"}
          </button>
          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <article className="panel">
          <h3>Recommended response</h3>
          {!result ? (
            <div className="page-state">Ask a question and we'll pull advice from our coaching library.</div>
          ) : (
            <div className="analysis-result">
              <p className="summary">{result.answer || "See the reference material below."}</p>
              {result.sources.length > 0 ? (
                <>
                  <h4>Based on these guides</h4>
                  {result.sources.map((source) => (
                    <div key={source.chunk_id} className="source-card">
                      <strong>{source.document_name}</strong>
                      <p>{source.text}</p>
                    </div>
                  ))}
                </>
              ) : null}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
