import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { RagQueryResponse } from "../types";
import { AlertBanner, Card, Chip, EmptyState, PageHeader, SourceCard, Button, CopyButton } from "../components/ui";

const STARTERS = [
  { label: "Price objection", q: "The customer says our price is too high. What should I say?" },
  { label: "Refund request", q: "Customer wants a refund but policy says no. How do I handle it?", category: "refund" },
  { label: "Escalation", q: "Customer is angry and wants a supervisor. What do I do?", category: "escalation" },
  { label: "Scheduling", q: "Customer wants to reschedule their appointment.", category: "scheduling" },
];

const CATEGORIES = ["pricing", "refund", "insurance", "escalation", "scheduling"];

function isCoachingOfflineError(message: string): boolean {
  return /502|RAG service unavailable|unreachable|Failed to fetch|NetworkError/i.test(message);
}

export default function KnowledgeAssistPage() {
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get("q")?.trim() || STARTERS[0].q;
  const [question, setQuestion] = useState(initialQ);
  const [category, setCategory] = useState<string | undefined>();
  const [guidesOnly, setGuidesOnly] = useState(false);
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAsked = useRef(false);

  const ask = async (nextQuestion: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.askPlaybook(nextQuestion, 5, guidesOnly, category);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get coaching tips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromCall = searchParams.get("q")?.trim();
    if (!fromCall) return;
    setQuestion(fromCall);
    if (autoAsked.current) return;
    autoAsked.current = true;
    void ask(fromCall);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleAsk = async (event: FormEvent) => {
    event.preventDefault();
    await ask(question);
  };

  return (
    <div className="page">
      <PageHeader
        title="Coaching Tips"
        subtitle="Stuck on a call? Ask what to say — Talksmith searches proven playbooks and gives you plain advice."
      />

      {searchParams.get("from") ? (
        <p className="form-note">
          Pre-filled from call{" "}
          <Link className="inline-link" to={`/calls/${searchParams.get("from")}`}>
            {searchParams.get("from")}
          </Link>
          . Edit the question below or wait for tips to load.
        </p>
      ) : null}

      {error && isCoachingOfflineError(error) ? (
        <AlertBanner
          variant="warning"
          title="Coaching library unavailable"
          message="The RAG coaching engine could not be reached. Open Settings to check connections or rebuild the index."
        />
      ) : null}
      {error && isCoachingOfflineError(error) ? (
        <p className="form-note">
          <Link to="/integrations">Open Settings</Link> to check coaching / rebuild index.
        </p>
      ) : null}

      <div className="chip-row">
        {STARTERS.map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            active={question === s.q}
            onClick={() => {
              setQuestion(s.q);
              setCategory(s.category);
            }}
          />
        ))}
      </div>

      <section className="split-layout">
        <Card title="What's the situation?" description="Describe what the customer said or what you're unsure about.">
          <form className="analyze-form" onSubmit={handleAsk}>
            <textarea
              rows={6}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              minLength={3}
              placeholder="e.g. Customer wants a refund but policy says no…"
            />
            <label className="checkbox-row">
              <input type="checkbox" checked={guidesOnly} onChange={(e) => setGuidesOnly(e.target.checked)} />
              Show guides only (skip AI summary)
            </label>
            <div className="chip-row">
              {CATEGORIES.map((c) => (
                <Chip key={c} label={c} active={category === c} onClick={() => setCategory(category === c ? undefined : c)} />
              ))}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Finding advice…" : "Get coaching tips"}
            </Button>
            {error && !isCoachingOfflineError(error) ? <p className="form-error">{error}</p> : null}
          </form>
        </Card>

        <Card title="Recommended response">
          {!result ? (
            <EmptyState title="No advice yet" message="Ask a question or pick a starter above." />
          ) : (
            <div className="analysis-result">
              {result.answer.includes("Safety situation") ? (
                <AlertBanner variant="danger" title="Safety protocol" message={result.answer} />
              ) : (
                <>
                  <div className="section-heading-row">
                    <h4>What to say</h4>
                    <CopyButton text={result.answer} label="Copy advice" />
                  </div>
                  <p className="summary answer-block">{result.answer || "See the reference material below."}</p>
                </>
              )}
              <div className="generator-badge">
                Source: {result.generator === "guide-fallback" ? "Coaching library" : result.generator}
              </div>
              {result.sources.length > 0 ? (
                <>
                  <h4>Based on these guides</h4>
                  {result.sources.map((source) => (
                    <SourceCard
                      key={source.chunk_id}
                      title={source.document_name}
                      text={source.text}
                      score={source.score}
                      tag={String(source.metadata?.industry || "")}
                    />
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
