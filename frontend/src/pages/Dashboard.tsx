import { useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api/client";
import type { DashboardMetrics, TopicsResponse } from "../types";
import { Card, Chip, EmptyState, LoadingSkeleton, MetricCard, PageHeader } from "../components/ui";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  neutral: "#94a3b8",
  negative: "#ef4444",
  mixed: "#f59e0b",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Happy",
  neutral: "Okay",
  negative: "Unhappy",
  mixed: "Mixed",
};

const OUTCOME_LABELS: Record<string, string> = {
  booked: "Won / Booked",
  not_booked: "Did not book",
  callback: "Call back later",
  voicemail: "Voicemail",
  disconnected: "Hung up",
};

type RangePreset = "7d" | "30d" | "all";

function rangeParams(preset: RangePreset): { from_date?: string; to_date?: string } {
  if (preset === "all") return {};
  const days = preset === "7d" ? 7 : 30;
  const from = new Date();
  from.setUTCDate(from.getUTCDate() - days);
  from.setUTCHours(0, 0, 0, 0);
  return { from_date: from.toISOString() };
}

function MetricCardLocal({ label, value, hint, icon }: { label: string; value: string; hint?: string; icon?: string }) {
  return <MetricCard label={label} value={value} hint={hint} icon={icon} />;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topics, setTopics] = useState<TopicsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("all");

  const dashboardParams = useMemo(() => rangeParams(range), [range]);

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    api
      .getDashboard(dashboardParams)
      .then(setMetrics)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
  }, [range]);

  useEffect(() => {
    api.topicInsights().then(setTopics).catch(() => null);
  }, []);

  const handleLoadSampleCalls = async () => {
    setImporting(true);
    setImportMsg(null);
    try {
      const result = await api.importCorpus(undefined, 200);
      setImportMsg(`Added ${result.imported} new calls to your library. Refreshing…`);
      loadDashboard();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Could not load calls");
    } finally {
      setImporting(false);
    }
  };

  if (loading && !metrics) return <LoadingSkeleton rows={5} />;
  if (error && !metrics) return <div className="page-state error">Something went wrong: {error}</div>;
  if (!metrics) return null;

  const sentimentData = Object.entries(metrics.sentiment_distribution).map(([name, value]) => ({
    name: SENTIMENT_LABELS[name] ?? name,
    value,
  }));
  const outcomeData = Object.entries(metrics.outcome_distribution).map(([name, value]) => ({
    name: OUTCOME_LABELS[name] ?? name.replace("_", " "),
    value,
  }));

  const showLoadMore = metrics.total_calls < 50 && range === "all";
  const emptyRange = metrics.total_calls === 0;

  return (
    <div className="page">
      <section className="welcome-banner panel">
        <h2>Welcome to Talksmith</h2>
        <p className="welcome-lead">
          Talksmith helps you <strong>see how calls went</strong>, <strong>coach your team</strong>, and{" "}
          <strong>find examples</strong> when someone is stuck on a difficult conversation.
        </p>
        <ul className="welcome-list">
          <li><strong>Managers:</strong> check the numbers below — who's winning calls, who needs help.</li>
          <li><strong>Agents:</strong> go to <em>Coaching Tips</em> or <em>Find Similar</em> when you need advice mid-call.</li>
        </ul>
        {showLoadMore ? (
          <div className="welcome-action">
            <p className="form-note">You're seeing a small demo set. Load the full sample library to explore more.</p>
            <button type="button" onClick={handleLoadSampleCalls} disabled={importing}>
              {importing ? "Loading calls…" : "Load full call library (600+)"}
            </button>
          </div>
        ) : null}
        {importMsg ? <p className="form-note">{importMsg}</p> : null}
      </section>

      <section className="getting-started panel">
        <h3>Getting started</h3>
        <div className="checklist">
          <div className={`check-item ${metrics.total_calls >= 50 || range !== "all" ? "done" : ""}`}>① Load call library</div>
          <div className="check-item">② Try Coaching Tips</div>
          <div className="check-item">③ Review one call</div>
        </div>
      </section>

      <PageHeader title="Team Overview" subtitle="A quick snapshot of how conversations are going." />

      <div className="chip-row">
        <Chip label="Last 7 days" active={range === "7d"} onClick={() => setRange("7d")} />
        <Chip label="Last 30 days" active={range === "30d"} onClick={() => setRange("30d")} />
        <Chip label="All time" active={range === "all"} onClick={() => setRange("all")} />
      </div>

      {loading ? <LoadingSkeleton rows={2} /> : null}
      {error ? <div className="page-state error">{error}</div> : null}

      {emptyRange && !loading ? (
        <EmptyState title="No calls in this range" message="Try All time, or load more sample calls from Settings." />
      ) : null}

      {!emptyRange ? (
        <>
          <section className="metric-grid">
            <MetricCardLocal label="Calls handled" value={String(metrics.total_calls)} hint="In selected range" icon="☰" />
            <MetricCardLocal label="Success rate" value={`${(metrics.booking_rate * 100).toFixed(1)}%`} hint="Calls that ended well" icon="✓" />
            <MetricCardLocal
              label="Customer mood"
              value={metrics.avg_sentiment_score >= 0.3 ? "Mostly good" : metrics.avg_sentiment_score >= 0 ? "Mixed" : "Needs attention"}
              hint="Based on call tone"
              icon="◉"
            />
            <MetricCardLocal label="Avg call length" value={`${Math.round(metrics.avg_duration_seconds / 60)} min`} hint="Typical conversation" icon="⏱" />
          </section>

          {topics && topics.topics.length > 0 ? (
            <Card title="Trending issues" description="Common topics from your call library (powered by RAG).">
              <div className="topic-grid">
                {topics.topics.map((t) => (
                  <div key={t.topic} className="topic-card">
                    <strong>{t.topic}</strong>
                    <span>{t.count} calls</span>
                    <p>{t.sample_text}</p>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <section className="chart-grid">
            <article className="panel">
              <h3>Calls over time</h3>
              <p className="panel-desc">How many conversations happened each day.</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={metrics.calls_by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                  <Legend />
                  <Line type="monotone" dataKey="calls" name="Calls" stroke="#38bdf8" strokeWidth={2} />
                  <Line type="monotone" dataKey="bookings" name="Wins" stroke="#22c55e" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </article>

            <article className="panel">
              <h3>How customers felt</h3>
              <p className="panel-desc">Were people happy, neutral, or upset?</p>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {sentimentData.map((entry, i) => (
                      <Cell key={entry.name} fill={Object.values(SENTIMENT_COLORS)[i] ?? "#64748b"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </article>

            <article className="panel">
              <h3>How calls ended</h3>
              <p className="panel-desc">Booked, callback, voicemail, etc.</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={outcomeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }} />
                  <Bar dataKey="value" fill="#818cf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="panel">
              <h3>Words that came up a lot</h3>
              <p className="panel-desc">Common topics in recent calls.</p>
              <ul className="keyword-list">
                {metrics.top_keywords.map((keyword) => (
                  <li key={keyword.term}>
                    <span>{keyword.term}</span>
                    <span className="badge">{keyword.count}</span>
                  </li>
                ))}
              </ul>
            </article>
          </section>

          <section className="panel">
            <h3>Top performers</h3>
            <p className="panel-desc">Who is handling the most calls and closing the most wins.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Calls</th>
                    <th>Wins</th>
                    <th>Success rate</th>
                    <th>Mood score</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.agent_leaderboard.map((row) => (
                    <tr key={row.agent_id}>
                      <td>{row.name}</td>
                      <td>{row.calls}</td>
                      <td>{row.bookings}</td>
                      <td>{(row.booking_rate * 100).toFixed(1)}%</td>
                      <td>{row.avg_sentiment >= 0.3 ? "Good" : row.avg_sentiment >= 0 ? "Okay" : "Low"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
