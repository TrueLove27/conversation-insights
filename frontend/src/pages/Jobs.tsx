import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { JobRecord, JobStatus, JobType } from "../types";
import { EmptyState, LoadingSkeleton, Button } from "../components/ui";
import { JobPayloadSummary, JobResultPanel } from "../components/JobResultPanel";
import { useAsyncLoad } from "../hooks/useAsyncLoad";

const JOB_TYPES: JobType[] = ["batch_analysis", "transcript_analysis", "agent_report", "keyword_extraction"];

function statusClass(status: JobStatus): string {
  return `job-status job-status-${status}`;
}

export default function JobsPage() {
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | "">("");
  const [newJobType, setNewJobType] = useState<JobType>("batch_analysis");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: jobs, setData: setJobs, loading, error, setError, reload } = useAsyncLoad<JobRecord[]>(
    (signal) => api.listJobs(statusFilter || undefined, signal),
    [statusFilter],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      api
        .listJobs(statusFilter || undefined, controller.signal)
        .then((records) => {
          if (controller.signal.aborted) return;
          setJobs(records);
          setError(null);
        })
        .catch(() => undefined);
    }, 3000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [statusFilter, setJobs, setError]);

  useEffect(() => {
    if (!jobs) return;
    setSelectedJob((current) => {
      if (current && jobs.some((job) => job.id === current.id)) {
        return jobs.find((job) => job.id === current.id) ?? current;
      }
      return jobs[0] ?? null;
    });
  }, [jobs]);

  const enqueueDemoJob = async () => {
    setActionError(null);
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
              : { call_ids: ["call-1001", "call-1002", "call-1003"] };

      await api.createJob({ job_type: newJobType, payload });
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create job";
      setActionError(
        /401|Unauthorized/i.test(message)
          ? "Unauthorized. Save a valid API key in Settings, then try again."
          : message,
      );
    }
  };

  const displayError = error || actionError;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h2>Background Job Queue</h2>
          <p>
            Run batch analysis, keyword extraction, and agent reports against live call data. Creating a job
            requires the admin API key saved in Settings.
          </p>
        </div>
        <div className="header-actions">
          <select value={newJobType} onChange={(event) => setNewJobType(event.target.value as JobType)}>
            {JOB_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button type="button" onClick={enqueueDemoJob}>
            Enqueue Job
          </Button>
        </div>
      </header>

      <section className="filters panel">
        <label htmlFor="status-filter">Filter by status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as JobStatus | "")}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </section>

      {displayError ? (
        <div className="page-state error retry-row">
          <span>{displayError}</span>
          <Button
            type="button"
            variant="glass"
            onClick={() => {
              setActionError(null);
              reload();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}

      {loading && !jobs ? <LoadingSkeleton rows={4} /> : null}

      <section className="split-layout">
        <article className="panel list-panel">
          <h3>Jobs ({jobs?.length ?? 0})</h3>
          {(jobs ?? []).length === 0 ? (
            <EmptyState title="No jobs in queue" message="Enqueue a job above to run batch analysis or reports." />
          ) : (
            <ul className="job-list">
              {(jobs ?? []).map((job) => (
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
          )}
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
                  <strong>
                    {selectedJob.completed_at ? new Date(selectedJob.completed_at).toLocaleString() : "—"}
                  </strong>
                </div>
              </div>
              <h4>What this job ran</h4>
              <JobPayloadSummary job={selectedJob} />
              <h4>Result</h4>
              <JobResultPanel job={selectedJob} />
              {selectedJob.error ? <p className="form-error">{selectedJob.error}</p> : null}
            </>
          ) : (
            <EmptyState title="No job selected" message="Enqueue a job or select one from the list." />
          )}
        </article>
      </section>
    </div>
  );
}
