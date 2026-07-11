import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { AnalyzeResponse, JobRecord } from "../types";

const SAMPLE_TRANSCRIPT =
  "Customer: Hi, I would like to schedule a product demo for next Tuesday if possible. " +
  "Agent: Absolutely, I can help with that. We have openings at 10 AM and 2 PM. " +
  "Customer: 2 PM works great, please confirm the appointment. " +
  "Agent: You are all set for Tuesday at 2 PM. Thank you for calling.";

export default function AnalyzePage() {
  const [transcript, setTranscript] = useState(SAMPLE_TRANSCRIPT);
  const [customerName, setCustomerName] = useState("Demo Customer");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCoaching, setUseCoaching] = useState(true);
  const [industry, setIndustry] = useState("healthcare");

  const handleAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const analysis = await api.analyzeTranscript({
        transcript,
        customer_name: customerName,
        use_rag_context: useCoaching,
        industry,
      });
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not review this call");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Review a Call</h2>
          <p>Paste a conversation and Talksmith will tell you how it went — and what could improve.</p>
        </div>
      </header>

      <section className="split-layout">
        <form className="panel analyze-form" onSubmit={handleAnalyze}>
          <h3>Paste the conversation</h3>
          <p className="panel-desc">Copy what the customer and agent said. We'll analyze the tone and outcome.</p>
          <label htmlFor="customer-name">Customer name</label>
          <input
            id="customer-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
          <label className="checkbox-row">
            <input type="checkbox" checked={useCoaching} onChange={(e) => setUseCoaching(e.target.checked)} />
            Include coaching tips from our playbook library
          </label>
          <label htmlFor="industry">Type of business</label>
          <select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="healthcare">Healthcare</option>
            <option value="saas">Software / SaaS</option>
            <option value="retail">Retail / Shopping</option>
            <option value="support">Customer support</option>
            <option value="banking">Banking / Finance</option>
          </select>
          <label htmlFor="transcript">Conversation</label>
          <textarea
            id="transcript"
            rows={14}
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            required
            minLength={10}
          />
          <div className="button-row">
            <button type="submit" disabled={loading}>
              {loading ? "Reviewing…" : "Review this call"}
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
        </form>

        <article className="panel">
          <h3>What we found</h3>
          {!result ? (
            <div className="page-state">Paste a conversation and hit "Review this call" to see results.</div>
          ) : (
            <div className="analysis-result">
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Customer mood</span>
                  <strong>{result.sentiment === "positive" ? "Happy" : result.sentiment === "negative" ? "Upset" : result.sentiment === "mixed" ? "Mixed" : "Neutral"}</strong>
                </div>
                <div>
                  <span className="detail-label">Wanted to book?</span>
                  <strong>{result.booking_intent ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span className="detail-label">Confidence</span>
                  <strong>{(result.booking_confidence * 100).toFixed(0)}%</strong>
                </div>
              </div>

              <h4>Summary</h4>
              <p className="summary">{result.summary}</p>

              {result.topics.length > 0 ? (
                <>
                  <h4>Topics discussed</h4>
                  <div className="tag-row">
                    {result.topics.map((topic) => (
                      <span key={topic} className="tag">{topic}</span>
                    ))}
                  </div>
                </>
              ) : null}

              {result.playbook_citations && result.playbook_citations.length > 0 ? (
                <>
                  <h4>Coaching suggestions</h4>
                  {result.playbook_citations.map((c) => (
                    <div key={c.document_id + c.text.slice(0, 20)} className="source-card">
                      <strong>{c.document_name}</strong>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </>
              ) : null}

              {result.similar_calls && result.similar_calls.length > 0 ? (
                <>
                  <h4>Similar calls from the library</h4>
                  {result.similar_calls.map((c) => (
                    <div key={c.document_id + c.text.slice(0, 20)} className="source-card">
                      <p>{c.text}</p>
                    </div>
                  ))}
                </>
              ) : null}

              {result.risk_flags.length > 0 ? (
                <>
                  <h4>Things to watch out for</h4>
                  <ul className="risk-list">
                    {result.risk_flags.map((flag) => (
                      <li key={flag}>{flag}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
