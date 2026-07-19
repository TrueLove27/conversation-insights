import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { AnalyzeResponse } from "../types";
import { AlertBanner, Card, EmptyState, PageHeader, SourceCard, Button } from "../components/ui";

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
      <PageHeader
        title="Review a Call"
        subtitle="Paste a conversation and Talksmith will tell you how it went — and what could improve."
      />

      <section className="split-layout">
        <Card title="Paste the conversation" description="Copy what the customer and agent said.">
          <form className="analyze-form" onSubmit={handleAnalyze}>
            <label htmlFor="customer-name">Customer name</label>
            <input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
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
              onChange={(e) => setTranscript(e.target.value)}
              required
              minLength={10}
            />
            <Button type="submit" disabled={loading}>
              {loading ? "Reviewing…" : "Review this call"}
            </Button>
            {error ? <p className="form-error">{error}</p> : null}
          </form>
        </Card>

        <Card title="What we found">
          {!result ? (
            <EmptyState title="No analysis yet" message='Paste a conversation and hit "Review this call".' />
          ) : (
            <div className="analysis-result">
              {result.escalation_required ? (
                <AlertBanner
                  variant="danger"
                  title="Escalation required"
                  message="This call contains safety or compliance risks. Follow emergency protocol immediately."
                />
              ) : null}

              {result.rag_degraded ? (
                <AlertBanner
                  variant="warning"
                  title="RAG context unavailable — showing rules/LLM analysis only"
                  message={
                    result.rag_warnings && result.rag_warnings.length > 0
                      ? result.rag_warnings.join(". ")
                      : "Coaching enrichment from the playbook library could not be loaded."
                  }
                />
              ) : null}

              {result.compliance_flags && result.compliance_flags.length > 0 ? (
                <AlertBanner
                  variant="warning"
                  title="Compliance notes"
                  message={result.compliance_flags.join(" ")}
                />
              ) : null}

              <div className="detail-grid">
                <div>
                  <span className="detail-label">Customer mood</span>
                  <strong>
                    {result.sentiment === "positive"
                      ? "Happy"
                      : result.sentiment === "negative"
                        ? "Upset"
                        : result.sentiment === "mixed"
                          ? "Mixed"
                          : "Neutral"}
                  </strong>
                </div>
                <div>
                  <span className="detail-label">Wanted to book?</span>
                  <strong>{result.booking_intent ? "Yes" : "No"}</strong>
                </div>
                <div>
                  <span className="detail-label">Confidence</span>
                  <strong>{(result.booking_confidence * 100).toFixed(0)}%</strong>
                </div>
                <div>
                  <span className="detail-label">Analysis</span>
                  <strong>{result.analysis_source || "basic"}</strong>
                </div>
              </div>

              <h4>Summary</h4>
              <p className="summary">{result.summary}</p>

              {result.suggested_script ? (
                <>
                  <h4>What to say next</h4>
                  <div className="script-block">{result.suggested_script}</div>
                </>
              ) : null}

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
                    <SourceCard key={c.document_id + c.text.slice(0, 20)} title={c.document_name} text={c.text} score={c.score} />
                  ))}
                </>
              ) : null}

              {result.similar_calls && result.similar_calls.length > 0 ? (
                <>
                  <h4>Similar calls from the library</h4>
                  {result.similar_calls.map((c) => (
                    <SourceCard key={c.document_id + c.text.slice(0, 20)} text={c.text} score={c.score} />
                  ))}
                </>
              ) : null}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
