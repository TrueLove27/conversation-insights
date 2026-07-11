from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class SentimentLabel(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class CallOutcome(str, Enum):
    BOOKED = "booked"
    NOT_BOOKED = "not_booked"
    CALLBACK = "callback"
    VOICEMAIL = "voicemail"
    DISCONNECTED = "disconnected"


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class JobType(str, Enum):
    BATCH_ANALYSIS = "batch_analysis"
    TRANSCRIPT_ANALYSIS = "transcript_analysis"
    AGENT_REPORT = "agent_report"
    KEYWORD_EXTRACTION = "keyword_extraction"


class KeywordHit(BaseModel):
    term: str
    count: int
    category: str


class SentimentBreakdown(BaseModel):
    positive: float = Field(ge=0, le=1)
    neutral: float = Field(ge=0, le=1)
    negative: float = Field(ge=0, le=1)


class CallRecord(BaseModel):
    id: str
    agent_id: str
    customer_name: str
    phone_number: str
    started_at: datetime
    duration_seconds: int
    outcome: CallOutcome
    sentiment: SentimentLabel
    sentiment_score: float = Field(ge=-1, le=1)
    booking_intent: bool
    transcript: str
    keywords: list[KeywordHit]
    summary: str
    language: str = "en"


class AgentRecord(BaseModel):
    id: str
    name: str
    team: str
    email: str
    active: bool
    hire_date: datetime
    total_calls: int
    avg_sentiment_score: float
    booking_rate: float
    avg_handle_time_seconds: int
    specialties: list[str]


class JobRecord(BaseModel):
    id: str
    job_type: JobType
    status: JobStatus
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None
    progress: int = Field(ge=0, le=100, default=0)
    payload: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] | None = None
    error: str | None = None


class CallFilterParams(BaseModel):
    agent_id: str | None = None
    outcome: CallOutcome | None = None
    sentiment: SentimentLabel | None = None
    search: str | None = None
    from_date: datetime | None = None
    to_date: datetime | None = None
    limit: int = Field(default=50, ge=1, le=500)
    offset: int = Field(default=0, ge=0)


class PaginatedCalls(BaseModel):
    items: list[CallRecord]
    total: int
    limit: int
    offset: int


class DashboardMetrics(BaseModel):
    total_calls: int
    booking_rate: float
    avg_sentiment_score: float
    avg_duration_seconds: float
    sentiment_distribution: dict[str, int]
    outcome_distribution: dict[str, int]
    calls_by_day: list[dict[str, Any]]
    top_keywords: list[KeywordHit]
    agent_leaderboard: list[dict[str, Any]]


class AgentMetrics(BaseModel):
    agent: AgentRecord
    recent_calls: list[CallRecord]
    sentiment_trend: list[dict[str, Any]]
    outcome_breakdown: dict[str, int]


class AnalyzeRequest(BaseModel):
    transcript: str = Field(min_length=10, max_length=10000)
    agent_id: str | None = None
    customer_name: str | None = None
    use_rag_context: bool = False
    industry: str | None = None


class RagCitation(BaseModel):
    document_id: str
    document_name: str
    text: str
    score: float


class AnalyzeResponse(BaseModel):
    sentiment: SentimentLabel
    sentiment_score: float
    sentiment_breakdown: SentimentBreakdown
    booking_intent: bool
    booking_confidence: float
    keywords: list[KeywordHit]
    summary: str
    topics: list[str]
    risk_flags: list[str]
    playbook_citations: list[RagCitation] = Field(default_factory=list)
    similar_calls: list[RagCitation] = Field(default_factory=list)
    analysis_source: str = "rules"


class JobCreateRequest(BaseModel):
    job_type: JobType
    payload: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    data_files: dict[str, bool]
    database: dict[str, Any] = Field(default_factory=dict)
    integrations: dict[str, Any] = Field(default_factory=dict)
    rate_limits: dict[str, str] = Field(default_factory=dict)


class CallIngestRequest(BaseModel):
    transcript: str = Field(min_length=20, max_length=20000)
    agent_id: str
    customer_name: str = Field(min_length=1, max_length=120)
    phone_number: str | None = None
    external_id: str | None = None
    started_at: datetime | None = None
    duration_seconds: int | None = Field(default=None, ge=0, le=7200)
    language: str = "en"


class IngestionResult(BaseModel):
    success: bool
    call_id: str | None = None
    event_id: str
    error: str | None = None
    analysis: AnalyzeResponse | None = None


class IngestionEvent(BaseModel):
    id: str
    source: str
    external_id: str | None = None
    status: str
    call_id: str | None = None
    payload: str | None = None
    error: str | None = None
    created_at: str


class IntegrationStatusResponse(BaseModel):
    database: dict[str, Any]
    groq: dict[str, Any]
    webhook: dict[str, Any]
    ingest_api_key_configured: bool
    rag_service: dict[str, Any] = Field(default_factory=dict)
    corpus_service: dict[str, Any] = Field(default_factory=dict)
