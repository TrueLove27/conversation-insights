import { useEffect, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import type { AgentMetrics, AgentRecord } from "../types";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listAgents()
      .then((records) => {
        setAgents(records);
        if (records.length > 0) {
          setSelectedId(records[0].id);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    api
      .getAgentMetrics(selectedId)
      .then(setMetrics)
      .catch((err: Error) => setError(err.message));
  }, [selectedId]);

  if (loading) return <div className="page-state">Loading agents...</div>;
  if (error) return <div className="page-state error">{error}</div>;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Your Team</h2>
          <p>See how each person is doing — calls handled, wins, and customer mood.</p>
        </div>
      </header>

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
              <span>{(agent.booking_rate * 100).toFixed(1)}% booking</span>
              <span>{agent.avg_sentiment_score.toFixed(2)} sentiment</span>
              <span>{Math.round(agent.avg_handle_time_seconds / 60)}m AHT</span>
            </div>
            <div className="tag-row">
              {agent.specialties.map((item) => (
                <span key={item} className="tag">
                  {item}
                </span>
              ))}
            </div>
          </button>
        ))}
      </section>

      {metrics ? (
        <section className="chart-grid">
          <article className="panel">
            <h3>Sentiment Trend — {metrics.agent.name}</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={metrics.sentiment_trend}>
                <XAxis
                  dataKey="timestamp"
                  stroke="#94a3b8"
                  tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
                />
                <YAxis domain={[-1, 1]} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}
                  labelFormatter={(value) => new Date(String(value)).toLocaleString()}
                />
                <Line type="monotone" dataKey="sentiment_score" stroke="#38bdf8" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </article>

          <article className="panel">
            <h3>Recent Calls</h3>
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
          </article>
        </section>
      ) : null}
    </div>
  );
}
