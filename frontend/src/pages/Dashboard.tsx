import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import type { DashboardMetrics } from "../types";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#94a3b8",
  negative: "#ef4444",
  mixed: "#f59e0b",
};

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {hint ? <span className="metric-hint">{hint}</span> : null}
    </article>
  );
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getDashboard()
      .then(setMetrics)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-state">Loading dashboard metrics...</div>;
  if (error) return <div className="page-state error">Failed to load dashboard: {error}</div>;
  if (!metrics) return null;

  const sentimentData = Object.entries(metrics.sentiment_distribution).map(([name, value]) => ({ name, value }));
  const outcomeData = Object.entries(metrics.outcome_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Operations Dashboard</h2>
          <p>Real-time overview of voice call performance and sentiment trends.</p>
        </div>
      </header>

      <section className="metric-grid">
        <MetricCard label="Total Calls" value={String(metrics.total_calls)} hint="Last 10 days" />
        <MetricCard label="Booking Rate" value={`${(metrics.booking_rate * 100).toFixed(1)}%`} hint="Booked / total" />
        <MetricCard label="Avg Sentiment" value={metrics.avg_sentiment_score.toFixed(2)} hint="Scale -1 to 1" />
        <MetricCard label="Avg Duration" value={`${Math.round(metrics.avg_duration_seconds)}s`} hint="Handle time" />
      </section>

      <section className="chart-grid">
        <article className="panel">
          <h3>Calls & Bookings by Day</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={metrics.calls_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#38bdf8" strokeWidth={2} />
              <Line type="monotone" dataKey="bookings" stroke="#22c55e" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <h3>Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                {sentimentData.map((entry) => (
                  <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] ?? "#64748b"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <h3>Outcome Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={outcomeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
              <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="panel">
          <h3>Top Keywords</h3>
          <ul className="keyword-list">
            {metrics.top_keywords.map((keyword) => (
              <li key={keyword.term}>
                <span>{keyword.term}</span>
                <span className="badge">{keyword.count}</span>
                <span className="muted">{keyword.category}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel">
        <h3>Agent Leaderboard</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>Calls</th>
                <th>Bookings</th>
                <th>Booking Rate</th>
                <th>Avg Sentiment</th>
              </tr>
            </thead>
            <tbody>
              {metrics.agent_leaderboard.map((row) => (
                <tr key={row.agent_id}>
                  <td>{row.name}</td>
                  <td>{row.calls}</td>
                  <td>{row.bookings}</td>
                  <td>{(row.booking_rate * 100).toFixed(1)}%</td>
                  <td>{row.avg_sentiment.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
