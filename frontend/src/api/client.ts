import type {
  AgentMetrics,
  AgentRecord,
  AnalyzeResponse,
  CallOutcome,
  CallRecord,
  DashboardMetrics,
  HealthResponse,
  JobRecord,
  JobStatus,
  JobType,
  PaginatedCalls,
  SentimentLabel,
} from "../types";

const API_BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  getDashboard: () => request<DashboardMetrics>("/analytics/dashboard"),

  listCalls: (params?: {
    agent_id?: string;
    outcome?: CallOutcome;
    sentiment?: SentimentLabel;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.agent_id) query.set("agent_id", params.agent_id);
    if (params?.outcome) query.set("outcome", params.outcome);
    if (params?.sentiment) query.set("sentiment", params.sentiment);
    if (params?.search) query.set("search", params.search);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<PaginatedCalls>(`/calls${suffix}`);
  },

  getCall: (callId: string) => request<CallRecord>(`/calls/${callId}`),

  listAgents: () => request<AgentRecord[]>("/agents"),

  getAgent: (agentId: string) => request<AgentRecord>(`/agents/${agentId}`),

  getAgentMetrics: (agentId: string) => request<AgentMetrics>(`/analytics/agents/${agentId}`),

  analyzeTranscript: (payload: { transcript: string; agent_id?: string; customer_name?: string }) =>
    request<AnalyzeResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listJobs: (status?: JobStatus) => {
    const suffix = status ? `?status=${status}` : "";
    return request<JobRecord[]>(`/jobs${suffix}`);
  },

  getJob: (jobId: string) => request<JobRecord>(`/jobs/${jobId}`),

  createJob: (payload: { job_type: JobType; payload?: Record<string, unknown> }) =>
    request<JobRecord>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
