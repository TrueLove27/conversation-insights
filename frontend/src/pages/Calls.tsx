import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AgentRecord, CallOutcome, CallRecord, PaginatedCalls, SentimentLabel } from "../types";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function badgeClass(prefix: string, value: string): string {
  return `${prefix} ${prefix}-${value.replace("_", "-")}`;
}

export default function CallsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [data, setData] = useState<PaginatedCalls | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [search, setSearch] = useState("");
  const [agentId, setAgentId] = useState("");
  const [outcome, setOutcome] = useState<CallOutcome | "">("");
  const [sentiment, setSentiment] = useState<SentimentLabel | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCalls = () => {
    setLoading(true);
    api
      .listCalls({
        search: search || undefined,
        agent_id: agentId || undefined,
        outcome: outcome || undefined,
        sentiment: sentiment || undefined,
        limit: 50,
      })
      .then((response) => {
        setData(response);
        if (response.items.length > 0) {
          setSelectedCall((current) => current ?? response.items[0]);
        } else {
          setSelectedCall(null);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api.listAgents().then(setAgents).catch(() => undefined);
  }, []);

  useEffect(() => {
    loadCalls();
  }, [agentId, outcome, sentiment]);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Call Explorer</h2>
          <p>Search, filter, and inspect synthetic voice call transcripts.</p>
        </div>
      </header>

      <section className="filters panel">
        <input
          type="search"
          placeholder="Search transcript, customer, summary..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && loadCalls()}
        />
        <select value={agentId} onChange={(event) => setAgentId(event.target.value)}>
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name}
            </option>
          ))}
        </select>
        <select value={outcome} onChange={(event) => setOutcome(event.target.value as CallOutcome | "")}>
          <option value="">All outcomes</option>
          <option value="booked">Booked</option>
          <option value="not_booked">Not booked</option>
          <option value="callback">Callback</option>
          <option value="voicemail">Voicemail</option>
          <option value="disconnected">Disconnected</option>
        </select>
        <select value={sentiment} onChange={(event) => setSentiment(event.target.value as SentimentLabel | "")}>
          <option value="">All sentiment</option>
          <option value="positive">Positive</option>
          <option value="neutral">Neutral</option>
          <option value="negative">Negative</option>
          <option value="mixed">Mixed</option>
        </select>
        <button type="button" onClick={loadCalls}>
          Apply
        </button>
      </section>

      {error ? <div className="page-state error">{error}</div> : null}
      {loading ? <div className="page-state">Loading calls...</div> : null}

      {!loading && data ? (
        <section className="split-layout">
          <article className="panel list-panel">
            <div className="panel-heading">
              <h3>Calls ({data.total})</h3>
            </div>
            <ul className="call-list">
              {data.items.map((call) => (
                <li key={call.id}>
                  <button
                    type="button"
                    className={selectedCall?.id === call.id ? "call-item active" : "call-item"}
                    onClick={() => setSelectedCall(call)}
                  >
                    <strong>{call.customer_name}</strong>
                    <span>{new Date(call.started_at).toLocaleString()}</span>
                    <span className={badgeClass("pill", call.sentiment)}>{call.sentiment}</span>
                    <span className={badgeClass("pill", call.outcome)}>{call.outcome.replace("_", " ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel detail-panel">
            {selectedCall ? (
              <>
                <div className="panel-heading">
                  <h3>{selectedCall.customer_name}</h3>
                  <p>{selectedCall.id}</p>
                </div>
                <div className="detail-grid">
                  <div>
                    <span className="detail-label">Agent</span>
                    <strong>{selectedCall.agent_id}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Duration</span>
                    <strong>{formatDuration(selectedCall.duration_seconds)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Sentiment Score</span>
                    <strong>{selectedCall.sentiment_score.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="detail-label">Booking Intent</span>
                    <strong>{selectedCall.booking_intent ? "Yes" : "No"}</strong>
                  </div>
                </div>
                <p className="summary">{selectedCall.summary}</p>
                <h4>Keywords</h4>
                <div className="tag-row">
                  {selectedCall.keywords.map((keyword) => (
                    <span key={keyword.term} className="tag">
                      {keyword.term} ({keyword.count})
                    </span>
                  ))}
                </div>
                <h4>Transcript</h4>
                <pre className="transcript">{selectedCall.transcript}</pre>
              </>
            ) : (
              <div className="page-state">No calls match the current filters.</div>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
}
