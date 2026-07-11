import type {
  AgentMetrics,
  AgentRecord,
  AnalyzeResponse,
  CallOutcome,
  CallRecord,
  DashboardMetrics,
  HealthResponse,
  IngestionEvent,
  IngestionResult,
  IntegrationStatus,
  JobRecord,
  JobStatus,
  JobType,
  PaginatedCalls,
  RagQueryResponse,
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

  analyzeTranscript: (payload: {
    transcript: string;
    agent_id?: string;
    customer_name?: string;
    use_rag_context?: boolean;
    industry?: string;
  }) =>
    request<AnalyzeResponse>("/analyze", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  askPlaybook: (question: string, top_k = 5) =>
    request<RagQueryResponse>("/knowledge/ask", {
      method: "POST",
      body: JSON.stringify({ question, top_k }),
    }),

  searchSimilarCalls: (question: string, top_k = 5) =>
    request<RagQueryResponse>("/knowledge/similar-calls", {
      method: "POST",
      body: JSON.stringify({ question, top_k }),
    }),

  importCorpus: (industry?: string, limit = 50) => {
    const query = new URLSearchParams();
    if (industry) query.set("industry", industry);
    query.set("limit", String(limit));
    return request<{ imported: number; available: number }>(`/knowledge/import-corpus?${query}`, {
      method: "POST",
    });
  },

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

  getIntegrationStatus: () => request<IntegrationStatus>("/integrations/status"),

  listIngestionEvents: (limit = 30) =>
    request<IngestionEvent[]>(`/ingest/events?limit=${limit}`),

  ingestCall: (payload: {
    transcript: string;
    agent_id: string;
    customer_name: string;
    phone_number?: string;
    external_id?: string;
  }, apiKey: string) =>
    request<IngestionResult>("/ingest/call", {
      method: "POST",
      headers: { "X-API-Key": apiKey },
      body: JSON.stringify(payload),
    }),
};
