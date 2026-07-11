import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import type { AgentRecord, IntegrationStatus } from "../types";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  const load = () => {
    Promise.all([api.getIntegrationStatus(), api.listAgents()])
      .then(([s, a]) => {
        setStatus(s);
        setAgents(a);
      })
      .catch((e) => setError(String(e)));
  };

  useEffect(() => {
    load();
  }, []);

  const loadCalls = async () => {
    setImporting(true);
    setImportMsg("");
    try {
      const res = await api.importCorpus(undefined, 200);
      setImportMsg(`Loaded ${res.imported} calls into Talksmith.`);
      load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Failed to load calls");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Manage your call library and check that everything is connected.</p>
        </div>
      </header>

      {error && <div className="form-error">{error}</div>}

      <section className="panel">
        <h3>Your call library</h3>
        <p className="panel-desc">
          Talksmith can pull in sample calls from different industries (healthcare, banking, retail, etc.)
          so you have more than the built-in demo set to explore.
        </p>
        {status ? (
          <p className="form-note">
            Currently loaded: <strong>{String(status.database.calls ?? 0)}</strong> calls ·{" "}
            <strong>{agents.length}</strong> team members
          </p>
        ) : null}
        <button type="button" onClick={loadCalls} disabled={importing}>
          {importing ? "Loading…" : "Load more sample calls"}
        </button>
        {importMsg ? <p className="form-note">{importMsg}</p> : null}
      </section>

      {status && (
        <section className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">Smart coaching</div>
            <div className="metric-value">{status.rag_service?.status === "connected" ? "On" : "Off"}</div>
            <div className="metric-hint">Powers Coaching Tips & Find Similar</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Call library source</div>
            <div className="metric-value">{status.corpus_service?.status === "connected" ? "Connected" : "Offline"}</div>
            <div className="metric-hint">
              {status.corpus_service?.total_calls
                ? `${status.corpus_service.total_calls} calls available`
                : "Start the call library service"}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">AI analysis</div>
            <div className="metric-value">{status.groq.status === "connected" ? "On" : "Basic mode"}</div>
            <div className="metric-hint">Helps Review a Call give smarter summaries</div>
          </div>
        </section>
      )}

      <details className="panel advanced-panel">
        <summary>Advanced — for developers only</summary>
        <p className="panel-desc">
          API keys, webhooks, and ingestion endpoints. You don't need these for normal use.
        </p>
        <p className="form-note">
          Ingest endpoint: <code>POST /api/v1/ingest/call</code> with header <code>X-API-Key</code>
        </p>
      </details>
    </div>
  );
}
