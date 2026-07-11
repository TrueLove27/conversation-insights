import type {
  AgentDigest,
  AgentMetrics,
  AgentRecord,
  AnalyzeResponse,
  CallOutcome,
  CallRecord,
  ComplianceScan,
  DashboardMetrics,
  HealthResponse,
  IngestionEvent,
  IngestionResult,
  IntegrationStatus,
  JobRecord,
  JobStatus,
  JobType,
  PaginatedCalls,
  PreCallBrief,
  RagQueryResponse,
  RagSource,
  SentimentLabel,
  TopicsResponse,
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

  askPlaybook: (question: string, top_k = 5, retrieval_only = false, category?: string) =>
    request<RagQueryResponse>("/knowledge/ask", {
      method: "POST",
      body: JSON.stringify({ question, top_k, retrieval_only, category }),
    }),

  searchSimilarCalls: (question: string, top_k = 5) =>
    request<RagQueryResponse>("/knowledge/similar-calls", {
      method: "POST",
      body: JSON.stringify({ question, top_k }),
    }),

  bestPractices: (question: string, industry?: string) =>
    request<RagQueryResponse>("/knowledge/best-practices", {
      method: "POST",
      body: JSON.stringify({ question, industry }),
    }),

  scanCompliance: (transcript: string) =>
    request<ComplianceScan>("/knowledge/scan-compliance", {
      method: "POST",
      body: JSON.stringify({ transcript }),
    }),

  suggestScript: (transcript: string, industry?: string) =>
    request<{ suggested_script: string; sources: RagSource[]; generator: string }>(
      "/knowledge/suggest-script",
      { method: "POST", body: JSON.stringify({ transcript, industry }) },
    ),

  preCallBrief: (agent_id: string, industry?: string, specialties?: string[]) =>
    request<PreCallBrief>("/knowledge/pre-call-brief", {
      method: "POST",
      body: JSON.stringify({ agent_id, industry, specialties }),
    }),

  topicInsights: (industry?: string) => {
    const suffix = industry ? `?industry=${industry}` : "";
    return request<TopicsResponse>(`/knowledge/topics${suffix}`);
  },

  agentDigest: (agent_id: string, industry?: string) =>
    request<AgentDigest>("/knowledge/agent-digest", {
      method: "POST",
      body: JSON.stringify({ agent_id, industry }),
    }),

  syncRag: () =>
    request<{ success: boolean; message: string }>("/knowledge/sync-rag", { method: "POST" }),

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
