import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AgentRecord, IngestionEvent, IngestionResult, IntegrationStatus } from "../types";

const DEFAULT_API_KEY = "dev-ingest-key-change-me";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [events, setEvents] = useState<IngestionEvent[]>([]);
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [agentId, setAgentId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [transcript, setTranscript] = useState(
    "Agent: Good afternoon, thanks for calling. Customer: I'd like to book a demo for next Tuesday. Agent: I have 2 PM available. Customer: Perfect, please confirm."
  );
  const [result, setResult] = useState<IngestionResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    Promise.all([api.getIntegrationStatus(), api.listAgents(), api.listIngestionEvents()])
      .then(([s, a, e]) => {
        setStatus(s);
        setAgents(a);
        setEvents(e);
        if (!agentId && a.length) setAgentId(a[0].id);
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api.ingestCall(
        { transcript, agent_id: agentId, customer_name: customerName },
        apiKey
      );
      setResult(res);
      load();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Integrations &amp; ingestion</h2>
          <p>SQLite-backed call storage, webhook/API ingest pipeline, optional Groq LLM analysis, and rate-limited endpoints.</p>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      {status && (
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">Database calls</div>
            <div className="metric-value">{String(status.database.calls ?? 0)}</div>
            <div className="metric-hint">SQLite WAL mode</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Ingestion events</div>
            <div className="metric-value">{String(status.database.ingestion_events ?? 0)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Groq LLM</div>
            <div className="metric-value">{status.groq.status === "connected" ? "Live" : "Rules"}</div>
            <div className="metric-hint">{status.groq.configured ? status.groq.model : "Set GROQ_API_KEY"}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Webhook</div>
            <div className="metric-value">{status.webhook.configured ? "Secured" : "Open"}</div>
          </div>
        </div>
      )}

      <div className="split-layout">
        <section className="panel">
          <div className="panel-heading">
            <h3>Ingest call via API</h3>
            <p>POST /ingest/call · requires X-API-Key</p>
          </div>
          <form className="analyze-form" onSubmit={submit}>
            <label>
              API key
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </label>
            <label>
              Agent
              <select value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label>
              Customer name
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Alex Morgan" />
            </label>
            <label>
              Transcript
              <textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} required />
            </label>
            <div className="button-row">
              <button type="submit" disabled={loading}>{loading ? "Ingesting…" : "Ingest & analyze"}</button>
            </div>
          </form>
          {result && (
            <pre className="json-block">{JSON.stringify(result, null, 2)}</pre>
          )}
        </section>

        <section className="panel list-panel">
          <div className="panel-heading">
            <h3>Recent ingestion events</h3>
            <button type="button" className="secondary" onClick={load}>Refresh</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Source</th><th>Status</th><th>Call</th></tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>{new Date(ev.created_at).toLocaleString()}</td>
                    <td>{ev.source}</td>
                    <td><span className={`job-status job-status-${ev.status === "success" ? "completed" : "failed"}`}>{ev.status}</span></td>
                    <td>{ev.call_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
