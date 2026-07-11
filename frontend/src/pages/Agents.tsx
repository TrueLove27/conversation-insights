import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import type { AgentDigest, AgentMetrics, AgentRecord, PreCallBrief } from "../types";
import { Card, EmptyState, LoadingSkeleton, PageHeader, SourceCard } from "../components/ui";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [brief, setBrief] = useState<PreCallBrief | null>(null);
  const [digest, setDigest] = useState<AgentDigest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listAgents()
      .then((records) => {
        setAgents(records);
        if (records.length > 0) setSelectedId(records[0].id);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const agent = agents.find((a) => a.id === selectedId);
    api.getAgentMetrics(selectedId).then(setMetrics).catch((err: Error) => setError(err.message));
    api
      .preCallBrief(selectedId, agent?.specialties[0], agent?.specialties)
      .then(setBrief)
      .catch(() => setBrief(null));
    api.agentDigest(selectedId).then(setDigest).catch(() => setDigest(null));
  }, [selectedId, agents]);

  if (loading) return <LoadingSkeleton rows={4} />;
  if (error) return <div className="page-state error">{error}</div>;

  return (
    <div className="page">
      <PageHeader title="Your Team" subtitle="See how each person is doing — and get coaching briefs before calls." />

      <section className="agent-grid">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            className={selectedId === agent.id ? "agent-card active" : "agent-card"}
            onClick={() => setSelectedId(agent.id)}
          >
            <div className="agent-card-top">
              <strong>{agent.name}</strong>
              <span className={agent.active ? "status-pill online" : "status-pill offline"}>
                {agent.active ? "Active" : "Inactive"}
              </span>
            </div>
            <p>{agent.team}</p>
            <div className="agent-stats">
              <span>{(agent.booking_rate * 100).toFixed(1)}% wins</span>
              <span>{agent.avg_sentiment_score.toFixed(2)} mood</span>
              <span>{Math.round(agent.avg_handle_time_seconds / 60)}m avg</span>
            </div>
            <div className="tag-row">
              {agent.specialties.map((item) => (
                <span key={item} className="tag">{item}</span>
              ))}
            </div>
          </button>
        ))}
      </section>

      {brief ? (
        <Card title="Before you call" description="RAG-powered briefing for the selected agent.">
          <p className="summary">{brief.summary}</p>
          <ul className="welcome-list">
            {brief.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
          {brief.playbooks.slice(0, 2).map((p) => (
            <SourceCard key={p.chunk_id} title={p.document_name} text={p.text} score={p.score} />
          ))}
        </Card>
      ) : null}

      {digest ? (
        <Card title="Weekly coaching digest" description="Focus areas powered by playbook search.">
          <p className="summary">{digest.summary}</p>
          <div className="tag-row">
            {digest.focus_areas.map((f) => (
              <span key={f} className="tag">{f}</span>
            ))}
          </div>
        </Card>
      ) : null}

      {metrics ? (
        <section className="chart-grid">
          <Card title={`Sentiment trend — ${metrics.agent.name}`}>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={metrics.sentiment_trend}>
                <XAxis dataKey="timestamp" stroke="#94a3b8" tickFormatter={(v: string) => new Date(v).toLocaleDateString()} />
                <YAxis domain={[-1, 1]} stroke="#94a3b8" />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                <Line type="monotone" dataKey="sentiment_score" stroke="#f59e0b" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Recent calls">
            {metrics.recent_calls.length === 0 ? (
              <EmptyState title="No calls" message="This agent has no recent calls yet." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Outcome</th>
                      <th>Sentiment</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.recent_calls.map((call) => (
                      <tr key={call.id}>
                        <td>{call.customer_name}</td>
                        <td>{call.outcome.replace("_", " ")}</td>
                        <td>{call.sentiment}</td>
                        <td>{new Date(call.started_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      ) : null}
    </div>
  );
}
