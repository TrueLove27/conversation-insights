import { useEffect, useState } from "react";
import { api, getAdminApiKey, setAdminApiKey } from "../api/client";
import type { AgentRecord, IntegrationStatus } from "../types";
import { Card, MetricCard, PageHeader, ServiceStatus, Button } from "../components/ui";

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [apiKey, setApiKey] = useState(() => getAdminApiKey());
  const [keySaved, setKeySaved] = useState(false);

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

  const saveKey = () => {
    setAdminApiKey(apiKey.trim());
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

  const loadCalls = async () => {
    setImporting(true);
    setImportMsg("");
    try {
      const res = await api.importCorpus(undefined, 200);
      const syncNote = res.rag_sync_scheduled ? " Coaching index rebuild scheduled." : "";
      setImportMsg(`Loaded ${res.imported} calls into Talksmith.${syncNote}`);
      load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Failed to load calls");
    } finally {
      setImporting(false);
    }
  };

  const rebuildIndex = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await api.syncRag();
      setSyncMsg(res.message || "Coaching index rebuilt.");
      load();
    } catch (err) {
      setSyncMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const rag = status?.rag_service;
  const corpus = status?.corpus_service;

  return (
    <div className="page">
      <PageHeader title="Settings" subtitle="Manage your call library and check that everything is connected." />

      {error && <div className="form-error">{error}</div>}

      <Card title="Admin API key" description="Required for loading sample calls and rebuilding the coaching index.">
        <label htmlFor="admin-api-key">API key</label>
        <input
          id="admin-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="dev-ingest-key-change-me"
          autoComplete="off"
        />
        <div className="button-row">
          <Button type="button" onClick={saveKey}>
            Save API key
          </Button>
        </div>
        {keySaved ? <p className="form-note">API key saved in this browser.</p> : null}
        <p className="form-note">
          Local default: <code>dev-ingest-key-change-me</code> (same as <code>INGEST_API_KEY</code>).
        </p>
      </Card>

      <Card title="Your call library" description="Pull in sample calls from different industries to explore.">
        {status ? (
          <p className="form-note">
            Currently loaded: <strong>{String(status.database.calls ?? 0)}</strong> calls ·{" "}
            <strong>{agents.length}</strong> team members
          </p>
        ) : null}
        <div className="button-row">
          <Button type="button" onClick={loadCalls} disabled={importing}>
            {importing ? "Loading…" : "Load more sample calls"}
          </Button>
          <Button type="button" variant="glass" onClick={rebuildIndex} disabled={syncing}>
            {syncing ? "Rebuilding…" : "Rebuild coaching index"}
          </Button>
        </div>
        {importMsg ? <p className="form-note">{importMsg}</p> : null}
        {syncMsg ? <p className="form-note">{syncMsg}</p> : null}
      </Card>

      {status && (
        <>
          <section className="metric-grid">
            <MetricCard
              label="Smart coaching"
              value={rag?.status === "connected" ? "On" : "Off"}
              hint="Powers Coaching Tips & Find Similar"
              icon="✦"
            />
            <MetricCard
              label="Indexed chunks"
              value={String((rag?.corpus_chunks as number) || 0)}
              hint={`${String((rag?.playbook_chunks as number) || 0)} playbook chunks`}
              icon="☰"
            />
            <MetricCard
              label="Call library"
              value={corpus?.status === "connected" ? "Connected" : "Offline"}
              hint={corpus?.total_calls ? `${corpus.total_calls} available` : "Start corpus service"}
              icon="◎"
            />
            <MetricCard
              label="AI analysis"
              value={status.groq.status === "connected" ? "On" : "Basic"}
              hint="Smarter summaries on Review a Call"
              icon="◉"
            />
          </section>

          <Card title="Service connections" description="How Talksmith connects to the coaching engine.">
            <div className="service-grid">
              <ServiceStatus
                name="RAG coaching engine"
                status={rag?.status === "connected" ? "connected" : "offline"}
                detail={rag?.status === "connected" ? `${rag.total_queries || 0} queries served` : "Offline"}
              />
              <ServiceStatus
                name="Call library"
                status={corpus?.status === "connected" ? "connected" : "offline"}
                detail={corpus?.total_calls ? `${corpus.total_calls} calls` : "Not running"}
              />
              <ServiceStatus
                name="Groq LLM"
                status={status.groq.status === "connected" ? "connected" : "optional"}
                detail={status.groq.status === "connected" ? "Connected" : "Optional — uses basic mode"}
              />
            </div>
          </Card>
        </>
      )}

      <details className="panel advanced-panel">
        <summary>Advanced — for developers only</summary>
        <p className="panel-desc">API keys, webhooks, and ingestion endpoints.</p>
        <p className="form-note">
          Ingest: <code>POST /api/v1/ingest/call</code> · RAG sync: <code>POST /api/v1/knowledge/sync-rag</code>
        </p>
      </details>
    </div>
  );
}
