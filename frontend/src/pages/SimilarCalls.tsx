import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { RagQueryResponse } from "../types";
import { AlertBanner, Card, EmptyState, PageHeader, SourceCard, Button } from "../components/ui";

function isCoachingOfflineError(message: string): boolean {
  return /502|RAG service unavailable|unreachable|Failed to fetch|NetworkError/i.test(message);
}

function callPathFromSource(documentId: string | undefined): string | undefined {
  if (!documentId) return undefined;
  const id = documentId.trim();
  if (/^call[-_]/i.test(id) || /^[a-f0-9-]{8,}$/i.test(id)) {
    return `/calls/${encodeURIComponent(id)}`;
  }
  return undefined;
}

export default function SimilarCallsPage() {
  const [query, setQuery] = useState("Customer wants to reschedule an appointment and has insurance questions");
  const [result, setResult] = useState<RagQueryResponse | null>(null);
  const [bestPractices, setBestPractices] = useState<RagQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [industry, setIndustry] = useState("healthcare");

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const [similar, winners] = await Promise.all([
        api.searchSimilarCalls(query),
        api.bestPractices(query, industry),
      ]);
      setResult(similar);
      setBestPractices(winners);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Find Similar Calls"
        subtitle="Describe your situation and see how other agents handled something like it."
      />

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

      <section className="split-layout">
        <Card title="Describe the call" description="A few words is enough — we'll find matching conversations.">
          <form className="analyze-form" onSubmit={handleSearch}>
            <textarea rows={5} value={query} onChange={(e) => setQuery(e.target.value)} required minLength={3} />
            <label htmlFor="industry">Industry</label>
            <select id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)}>
              <option value="healthcare">Healthcare</option>
              <option value="saas">SaaS</option>
              <option value="retail">Retail</option>
              <option value="support">Support</option>
              <option value="banking">Banking</option>
            </select>
            <Button type="submit" disabled={loading}>
              {loading ? "Searching…" : "Find similar calls"}
            </Button>
            {error && !isCoachingOfflineError(error) ? <p className="form-error">{error}</p> : null}
          </form>
        </Card>

        <div className="stack-panels">
          <Card title="Matching conversations">
            {!result ? (
              <EmptyState title="No results" message="Enter a description to search the call library." />
            ) : result.sources.length === 0 ? (
              <EmptyState title="No matches" message="Try loading the call library from Overview first." />
            ) : (
              result.sources.map((source) => (
                <SourceCard
                  key={source.chunk_id}
                  text={source.text}
                  score={source.score}
                  tag={String(source.metadata?.industry || "")}
                  to={callPathFromSource(source.document_id)}
                />
              ))
            )}
          </Card>

          <Card title="How winners handled it">
            {!bestPractices ? (
              <EmptyState title="Best practices" message="Search above to see high-outcome examples." />
            ) : bestPractices.sources.length === 0 ? (
              <EmptyState title="No examples yet" message="Load more calls and sync coaching index." />
            ) : (
              bestPractices.sources.map((source) => (
                <SourceCard
                  key={`win-${source.chunk_id}`}
                  text={source.text}
                  score={source.score}
                  tag="best practice"
                  to={callPathFromSource(source.document_id)}
                />
              ))
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}
