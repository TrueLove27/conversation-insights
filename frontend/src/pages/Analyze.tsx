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
  const [queuedJob, setQueuedJob] = useState<JobRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const analysis = await api.analyzeTranscript({ transcript, customer_name: customerName });
      setResult(analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const handleQueueJob = async () => {
    setError(null);
    try {
      const job = await api.createJob({
        job_type: "transcript_analysis",
        payload: { transcript, customer_name: customerName },
      });
      setQueuedJob(job);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to queue job");
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Transcript Analysis</h2>
          <p>Run rule-based mock NLP to extract sentiment, keywords, and booking intent.</p>
        </div>
      </header>

      <section className="split-layout">
        <form className="panel analyze-form" onSubmit={handleAnalyze}>
          <h3>Input Transcript</h3>
          <label htmlFor="customer-name">Customer Name</label>
          <input
            id="customer-name"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
          />
          <label htmlFor="transcript">Transcript</label>
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
              {loading ? "Analyzing..." : "Analyze Now"}
            </button>
            <button type="button" className="secondary" onClick={handleQueueJob}>
              Queue Background Job
            </button>
          </div>
          {error ? <p className="form-error">{error}</p> : null}
          {queuedJob ? (
            <p className="form-note">Background job queued: {queuedJob.id} ({queuedJob.status})</p>
          ) : null}
        </form>

        <article className="panel">
          <h3>Analysis Result</h3>
          {!result ? (
            <div className="page-state">Submit a transcript to view analysis output.</div>
          ) : (
            <div className="analysis-result">
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Sentiment</span>
                  <strong>{result.sentiment}</strong>
                </div>
                <div>
                  <span className="detail-label">Score</span>
                  <strong>{result.sentiment_score.toFixed(2)}</strong>
                </div>
                <div>
                  <span className="detail-label">Booking Intent</span>
                  <strong>{result.booking_intent ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span className="detail-label">Confidence</span>
                  <strong>{(result.booking_confidence * 100).toFixed(0)}%</strong>
                </div>
              </div>

              <h4>Sentiment Breakdown</h4>
              <div className="breakdown-bars">
                <div>
                  <span>Positive</span>
                  <div className="bar-track">
                    <div className="bar-fill positive" style={{ width: `${result.sentiment_breakdown.positive * 100}%` }} />
                  </div>
                </div>
                <div>
                  <span>Neutral</span>
                  <div className="bar-track">
                    <div className="bar-fill neutral" style={{ width: `${result.sentiment_breakdown.neutral * 100}%` }} />
                  </div>
                </div>
                <div>
                  <span>Negative</span>
                  <div className="bar-track">
                    <div className="bar-fill negative" style={{ width: `${result.sentiment_breakdown.negative * 100}%` }} />
                  </div>
                </div>
              </div>

              <h4>Summary</h4>
              <p className="summary">{result.summary}</p>

              <h4>Topics</h4>
              <div className="tag-row">
                {result.topics.map((topic) => (
                  <span key={topic} className="tag">
                    {topic}
                  </span>
                ))}
              </div>

              <h4>Keywords</h4>
              <div className="tag-row">
                {result.keywords.map((keyword) => (
                  <span key={keyword.term} className="tag">
                    {keyword.term} ({keyword.count})
                  </span>
                ))}
              </div>

              {result.risk_flags.length > 0 ? (
                <>
                  <h4>Risk Flags</h4>
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
