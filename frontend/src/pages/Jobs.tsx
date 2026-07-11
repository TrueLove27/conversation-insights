import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { JobRecord, JobStatus, JobType } from "../types";

const JOB_TYPES: JobType[] = ["batch_analysis", "transcript_analysis", "agent_report", "keyword_extraction"];

function statusClass(status: JobStatus): string {
  return `job-status job-status-${status}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [newJobType, setNewJobType] = useState<JobType>("batch_analysis");
  const [error, setError] = useState<string | null>(null);

  const loadJobs = () => {
    api
      .listJobs(statusFilter || undefined)
      .then((records) => {
        setJobs(records);
        setSelectedJob((current) => current ?? records[0] ?? null);
      })
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    loadJobs();
    const timer = window.setInterval(loadJobs, 3000);
    return () => window.clearInterval(timer);
  }, [statusFilter]);

  const enqueueDemoJob = async () => {
    setError(null);
    try {
      const payload =
        newJobType === "batch_analysis"
          ? { call_ids: ["call-1001", "call-1006", "call-1010"] }
          : newJobType === "agent_report"
            ? { agent_id: "agent-002" }
            : newJobType === "transcript_analysis"
              ? {
                  transcript:
                    "Customer: Please schedule a follow-up for tomorrow. Agent: Confirmed for 11 AM. Customer: Thank you!",
                }
              : { date_range: "2026-07-01/2026-07-11" };

      await api.createJob({ job_type: newJobType, payload });
      loadJobs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create job");
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Background Job Queue</h2>
          <p>Simulated async workers for batch analysis and report generation.</p>
        </div>
        <div className="header-actions">
          <select value={newJobType} onChange={(event) => setNewJobType(event.target.value as JobType)}>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button type="button" onClick={enqueueDemoJob}>
            Enqueue Job
          </button>
        </div>
      </header>

      <section className="filters panel">
        <label htmlFor="status-filter">Filter by status</label>
        <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as JobStatus | "")}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </section>

      {error ? <div className="page-state error">{error}</div> : null}

      <section className="split-layout">
        <article className="panel list-panel">
          <h3>Jobs ({jobs.length})</h3>
          <ul className="job-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className={selectedJob?.id === job.id ? "job-item active" : "job-item"}
                  onClick={() => setSelectedJob(job)}
                >
                  <div>
                    <strong>{job.job_type}</strong>
                    <span>{job.id}</span>
                  </div>
                  <span className={statusClass(job.status)}>{job.status}</span>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${job.progress}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel detail-panel">
          {selectedJob ? (
            <>
              <div className="panel-heading">
                <h3>{selectedJob.job_type}</h3>
                <span className={statusClass(selectedJob.status)}>{selectedJob.status}</span>
              </div>
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Created</span>
                  <strong>{new Date(selectedJob.created_at).toLocaleString()}</strong>
                </div>
                <div>
                  <span className="detail-label">Progress</span>
                  <strong>{selectedJob.progress}%</strong>
                </div>
                <div>
                  <span className="detail-label">Started</span>
                  <strong>{selectedJob.started_at ? new Date(selectedJob.started_at).toLocaleString() : "—"}</strong>
                </div>
                <div>
                  <span className="detail-label">Completed</span>
                  <strong>{selectedJob.completed_at ? new Date(selectedJob.completed_at).toLocaleString() : "—"}</strong>
                </div>
              </div>
              <h4>Payload</h4>
              <pre className="json-block">{JSON.stringify(selectedJob.payload, null, 2)}</pre>
              <h4>Result</h4>
              <pre className="json-block">
                {selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : "No result yet"}
              </pre>
              {selectedJob.error ? <p className="form-error">{selectedJob.error}</p> : null}
            </>
          ) : (
            <div className="page-state">No jobs in queue.</div>
          )}
        </article>
      </section>
    </div>
  );
}
