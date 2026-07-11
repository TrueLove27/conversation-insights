export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";
export type CallOutcome = "booked" | "not_booked" | "callback" | "voicemail" | "disconnected";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type JobType = "batch_analysis" | "transcript_analysis" | "agent_report" | "keyword_extraction";

export interface KeywordHit {
  term: string;
  count: number;
  category: string;
}

export interface CallRecord {
  id: string;
  agent_id: string;
  customer_name: string;
  phone_number: string;
  started_at: string;
  duration_seconds: number;
  outcome: CallOutcome;
  sentiment: SentimentLabel;
  sentiment_score: number;
  booking_intent: boolean;
  transcript: string;
  keywords: KeywordHit[];
  summary: string;
  language: string;
}

export interface PaginatedCalls {
  items: CallRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface AgentRecord {
  id: string;
  name: string;
  team: string;
  email: string;
  active: boolean;
  hire_date: string;
  total_calls: number;
  avg_sentiment_score: number;
  booking_rate: number;
  avg_handle_time_seconds: number;
  specialties: string[];
}

export interface DashboardMetrics {
  total_calls: number;
  booking_rate: number;
  avg_sentiment_score: number;
  avg_duration_seconds: number;
  sentiment_distribution: Record<string, number>;
  outcome_distribution: Record<string, number>;
  calls_by_day: Array<{ date: string; calls: number; bookings: number }>;
  top_keywords: KeywordHit[];
  agent_leaderboard: Array<{
    agent_id: string;
    name: string;
    calls: number;
    bookings: number;
    avg_sentiment: number;
    booking_rate: number;
  }>;
}

export interface AgentMetrics {
  agent: AgentRecord;
  recent_calls: CallRecord[];
  sentiment_trend: Array<{ timestamp: string; sentiment_score: number; label: string }>;
  outcome_breakdown: Record<string, number>;
}

export interface SentimentBreakdown {
  positive: number;
  neutral: number;
  negative: number;
}

export interface AnalyzeResponse {
  sentiment: SentimentLabel;
  sentiment_score: number;
  sentiment_breakdown: SentimentBreakdown;
  booking_intent: boolean;
  booking_confidence: number;
  keywords: KeywordHit[];
  summary: string;
  topics: string[];
  risk_flags: string[];
  playbook_citations?: RagCitation[];
  similar_calls?: RagCitation[];
  compliance_flags?: string[];
  escalation_required?: boolean;
  suggested_script?: string | null;
  analysis_source?: string;
}

export interface ComplianceScan {
  risk_level: string;
  flags: string[];
  matched_keywords: string[];
  escalation_required: boolean;
  recommendation: string;
}

export interface PreCallBrief {
  agent_id: string;
  industry: string | null;
  summary: string;
  tips: string[];
  playbooks: RagSource[];
}

export interface TopicInsight {
  topic: string;
  count: number;
  sample_text: string;
}

export interface TopicsResponse {
  industry: string | null;
  topics: TopicInsight[];
}

export interface AgentDigest {
  agent_id: string;
  summary: string;
  focus_areas: string[];
  recommended_playbooks: RagSource[];
}

export interface RagCitation {
  document_id: string;
  document_name: string;
  text: string;
  score: number;
}

export interface RagSource {
  chunk_id: string;
  document_id: string;
  document_name: string;
  text: string;
  score: number;
  chunk_index: number;
  metadata?: Record<string, unknown>;
}

export interface RagQueryResponse {
  question: string;
  answer: string;
  sources: RagSource[];
  retrieval_time_ms: number;
  total_time_ms: number;
  generator: string;
}

export interface JobRecord {
  id: string;
  job_type: JobType;
  status: JobStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  progress: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  timestamp: string;
  data_files: Record<string, boolean>;
  database: Record<string, unknown>;
  integrations: Record<string, unknown>;
  rate_limits: Record<string, string>;
}

export interface IntegrationStatus {
  database: Record<string, unknown>;
  groq: { provider: string; configured: boolean; status: string; model?: string };
  webhook: { configured: boolean; status: string };
  ingest_api_key_configured: boolean;
  rag_service?: Record<string, unknown>;
  corpus_service?: Record<string, unknown>;
}

export interface IngestionEvent {
  id: string;
  source: string;
  status: string;
  call_id: string | null;
  created_at: string;
  error: string | null;
}

export interface IngestionResult {
  success: boolean;
  call_id: string | null;
  event_id: string;
  error: string | null;
  analysis: AnalyzeResponse | null;
}
