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


class JobCreateRequest(BaseModel):
    job_type: JobType
    payload: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    data_files: dict[str, bool]
