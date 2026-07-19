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
const ADMIN_API_KEY_STORAGE = "talksmith_api_key";

export function getAdminApiKey(): string {
  try {
    return localStorage.getItem(ADMIN_API_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setAdminApiKey(key: string): void {
  try {
    localStorage.setItem(ADMIN_API_KEY_STORAGE, key);
  } catch {
    // ignore storage failures (private mode)
  }
}

function adminHeaders(): Record<string, string> {
  const key = getAdminApiKey();
  return key ? { "X-API-Key": key } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized (401). Save a valid API key in Settings, then try again.");
    }
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<HealthResponse>("/health"),

  getDashboard: (params?: { from_date?: string; to_date?: string }) => {
    const query = new URLSearchParams();
    if (params?.from_date) query.set("from_date", params.from_date);
    if (params?.to_date) query.set("to_date", params.to_date);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return request<DashboardMetrics>(`/analytics/dashboard${suffix}`);
  },

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
    request<{ success: boolean; message: string }>("/knowledge/sync-rag", {
      method: "POST",
      headers: adminHeaders(),
    }),

  importCorpus: (industry?: string, limit = 50) => {
    const query = new URLSearchParams();
    if (industry) query.set("industry", industry);
    query.set("limit", String(limit));
    return request<{ imported: number; available: number; rag_sync_scheduled?: boolean }>(
      `/knowledge/import-corpus?${query}`,
      {
        method: "POST",
        headers: adminHeaders(),
      },
    );
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
    request<IngestionEvent[]>(`/ingest/events?limit=${limit}`, {
      headers: adminHeaders(),
    }),

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
