import { Link } from "react-router-dom";
import type { JobRecord, JobType } from "../types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function moodLabel(score: number): string {
  if (score >= 0.3) return "Mostly good";
  if (score >= 0) return "Mixed";
  return "Needs attention";
}

function BatchReport({ result }: { result: Record<string, unknown> }) {
  const processed = Number(result.processed ?? 0);
  const failed = Number(result.failed ?? 0);
  const avg = Number(result.avg_sentiment ?? 0);
  const rows = Array.isArray(result.results) ? result.results : [];

  return (
    <div className="job-report">
      <p className="job-report-lead">
        Analyzed <strong>{processed}</strong> call{processed === 1 ? "" : "s"}
        {failed > 0 ? (
          <>
            {" "}
            · <strong>{failed}</strong> failed
          </>
        ) : null}
        . Average mood score <strong>{avg.toFixed(2)}</strong> ({moodLabel(avg)}).
      </p>
      {rows.length > 0 ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Call</th>
                <th>Mood</th>
                <th>Score</th>
                <th>Booking?</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const item = asRecord(row);
                if (!item) return null;
                const callId = String(item.call_id ?? "");
                return (
                  <tr key={callId} className="row-link">
                    <td>
                      <Link to={`/calls/${callId}`}>{callId}</Link>
                    </td>
                    <td>
                      <Link to={`/calls/${callId}`}>{String(item.sentiment ?? "—")}</Link>
                    </td>
                    <td>
                      <Link to={`/calls/${callId}`}>
                        {typeof item.sentiment_score === "number"
                          ? item.sentiment_score.toFixed(2)
                          : "—"}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/calls/${callId}`}>{item.booking_intent ? "Yes" : "No"}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function KeywordReport({ result }: { result: Record<string, unknown> }) {
  const scanned = Number(result.scanned_calls ?? 0);
  const keywords = Array.isArray(result.keywords) ? result.keywords : [];

  return (
    <div className="job-report">
      <p className="job-report-lead">
        Scanned <strong>{scanned}</strong> call{scanned === 1 ? "" : "s"} and found{" "}
        <strong>{keywords.length}</strong> top keyword{keywords.length === 1 ? "" : "s"}.
      </p>
      <div className="tag-row">
        {keywords.map((row) => {
          const item = asRecord(row);
          if (!item) return null;
          const term = String(item.term ?? "");
          const count = Number(item.count ?? 0);
          const category = String(item.category ?? "general");
          return (
            <span key={term} className="tag">
              {term} · {category} ({count})
            </span>
          );
        })}
      </div>
    </div>
  );
}

function AgentReport({ result }: { result: Record<string, unknown> }) {
  const agentId = String(result.agent_id ?? "");
  const name = String(result.name ?? agentId);
  const calls = Number(result.calls ?? 0);
  const bookingRate = Number(result.booking_rate ?? 0);
  const avgSentiment = Number(result.avg_sentiment ?? 0);
  const outcomes = asRecord(result.outcome_breakdown) ?? {};
  const recentIds = Array.isArray(result.recent_call_ids)
    ? result.recent_call_ids.map(String)
    : [];

  return (
    <div className="job-report">
      <p className="job-report-lead">
        Report for{" "}
        <Link className="inline-link" to={`/agents/${agentId}`}>
          {name}
        </Link>
        {result.team ? <> · {String(result.team)}</> : null}
      </p>
      <div className="detail-grid">
        <div>
          <span className="detail-label">Calls</span>
          <strong>{calls}</strong>
        </div>
        <div>
          <span className="detail-label">Win rate</span>
          <strong>{(bookingRate * 100).toFixed(1)}%</strong>
        </div>
        <div>
          <span className="detail-label">Avg mood</span>
          <strong>
            {avgSentiment.toFixed(2)} ({moodLabel(avgSentiment)})
          </strong>
        </div>
      </div>
      {Object.keys(outcomes).length > 0 ? (
        <>
          <h4>How recent calls ended</h4>
          <div className="tag-row">
            {Object.entries(outcomes).map(([outcome, count]) => (
              <span key={outcome} className="tag">
                {outcome.replace("_", " ")} ({Number(count)})
              </span>
            ))}
          </div>
        </>
      ) : null}
      {recentIds.length > 0 ? (
        <>
          <h4>Recent calls</h4>
          <ul className="job-call-links">
            {recentIds.map((id) => (
              <li key={id}>
                <Link className="inline-link" to={`/calls/${id}`}>
                  {id}
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function TranscriptReport({ result }: { result: Record<string, unknown> }) {
  const sentiment = String(result.sentiment ?? "—");
  const score = Number(result.sentiment_score ?? 0);
  const booking = Boolean(result.booking_intent);
  const confidence = Number(result.booking_confidence ?? 0);
  const summary = String(result.summary ?? "");
  const keywords = Array.isArray(result.keywords) ? result.keywords : [];
  const risks = Array.isArray(result.risk_flags) ? result.risk_flags.map(String) : [];

  return (
    <div className="job-report">
      <p className="job-report-lead">
        Transcript scored <strong>{score.toFixed(2)}</strong> ({sentiment}) · booking intent{" "}
        <strong>{booking ? "Yes" : "No"}</strong> ({Math.round(confidence * 100)}% confidence).
      </p>
      {summary ? <p className="summary">{summary}</p> : null}
      {keywords.length > 0 ? (
        <>
          <h4>Keywords</h4>
          <div className="tag-row">
            {keywords.map((row) => {
              const item = asRecord(row);
              if (!item) return null;
              return (
                <span key={String(item.term)} className="tag">
                  {String(item.term)} ({Number(item.count ?? 0)})
                </span>
              );
            })}
          </div>
        </>
      ) : null}
      {risks.length > 0 ? (
        <>
          <h4>Risk flags</h4>
          <ul className="risk-list">
            {risks.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function titleFor(type: JobType): string {
  switch (type) {
    case "batch_analysis":
      return "Batch analysis report";
    case "keyword_extraction":
      return "Keyword extraction report";
    case "agent_report":
      return "Agent performance report";
    case "transcript_analysis":
      return "Transcript analysis report";
    default:
      return "Job report";
  }
}

export function JobResultPanel({ job }: { job: JobRecord }) {
  if (job.status === "pending" || job.status === "running") {
    return (
      <p className="form-note">
        {job.status === "pending" ? "Waiting to start…" : `Running — ${job.progress}% complete.`}
      </p>
    );
  }

  if (job.status === "failed") {
    return <p className="form-error">{job.error || "Job failed."}</p>;
  }

  const result = asRecord(job.result);
  if (!result) {
    return <p className="form-note">No result yet.</p>;
  }

  return (
    <div className="job-result-panel">
      <h4>{titleFor(job.job_type)}</h4>
      {job.job_type === "batch_analysis" ? <BatchReport result={result} /> : null}
      {job.job_type === "keyword_extraction" ? <KeywordReport result={result} /> : null}
      {job.job_type === "agent_report" ? <AgentReport result={result} /> : null}
      {job.job_type === "transcript_analysis" ? <TranscriptReport result={result} /> : null}
      {!["batch_analysis", "keyword_extraction", "agent_report", "transcript_analysis"].includes(
        job.job_type,
      ) ? (
        <p className="form-note">Job completed.</p>
      ) : null}
    </div>
  );
}

export function JobPayloadSummary({ job }: { job: JobRecord }) {
  const payload = job.payload ?? {};
  if (job.job_type === "batch_analysis" || job.job_type === "keyword_extraction") {
    const ids = Array.isArray(payload.call_ids) ? payload.call_ids.map(String) : [];
    return (
      <p className="form-note">
        {ids.length > 0
          ? `Target calls: ${ids.join(", ")}`
          : "Target: latest calls in the library"}
      </p>
    );
  }
  if (job.job_type === "agent_report") {
    const agentId = String(payload.agent_id ?? "");
    return (
      <p className="form-note">
        Agent:{" "}
        {agentId ? (
          <Link className="inline-link" to={`/agents/${agentId}`}>
            {agentId}
          </Link>
        ) : (
          "—"
        )}
      </p>
    );
  }
  if (job.job_type === "transcript_analysis") {
    const transcript = String(payload.transcript ?? "");
    return (
      <p className="form-note">
        Transcript length: {transcript.length} characters
        {transcript ? ` — “${transcript.slice(0, 80)}${transcript.length > 80 ? "…" : ""}”` : ""}
      </p>
    );
  }
  return null;
}
