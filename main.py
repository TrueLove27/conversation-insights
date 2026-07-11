"""Conversation Insights — call analytics API (portfolio demo)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

DATA_PATH = Path(__file__).parent / "data" / "sample_calls.json"
STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="Conversation Insights API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def _load_calls() -> list[dict]:
    return json.loads(DATA_PATH.read_text(encoding="utf-8"))


class AnalyzeRequest(BaseModel):
    transcript: str = Field(..., min_length=10, max_length=5000)
    agent_name: str = "Demo Agent"


class AnalyzeResponse(BaseModel):
    id: str
    sentiment: Literal["positive", "neutral", "negative"]
    sentiment_score: float
    keywords: list[str]
    summary: str
    booking_likelihood: float


def _mock_analyze(transcript: str) -> AnalyzeResponse:
    """Rule-based mock analysis — no external LLM calls."""
    text = transcript.lower()
    negative = sum(w in text for w in ("angry", "frustrated", "delay", "refund", "bad", "worst"))
    positive = sum(w in text for w in ("great", "thanks", "book", "schedule", "interested", "buy", "love"))
    score = max(0.1, min(0.95, 0.5 + (positive - negative) * 0.15))
    if score >= 0.65:
        sentiment = "positive"
    elif score <= 0.4:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    keywords = [w for w in ("pricing", "delivery", "warranty", "test ride", "financing", "support")
                if w.split()[0] in text or w in text][:4]
    if not keywords:
        keywords = ["general inquiry"]

    booking = 0.75 if any(w in text for w in ("book", "schedule", "appointment", "buy")) else 0.2
    summary = f"Mock analysis: {sentiment} tone detected across {len(transcript.split())} words."

    return AnalyzeResponse(
        id=str(uuid.uuid4())[:8],
        sentiment=sentiment,
        sentiment_score=round(score, 2),
        keywords=keywords,
        summary=summary,
        booking_likelihood=booking,
    )


@app.get("/", response_class=HTMLResponse)
def dashboard():
    index = STATIC_DIR / "index.html"
    if index.exists():
        return HTMLResponse(index.read_text(encoding="utf-8"))
    return HTMLResponse("<h1>Conversation Insights API</h1><p>See /docs</p>")


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "conversation-insights"}


@app.get("/api/calls")
def list_calls(
    agent: str | None = None,
    sentiment: str | None = None,
    limit: int = Query(50, ge=1, le=200),
):
    calls = _load_calls()
    if agent:
        calls = [c for c in calls if c["agent"].lower() == agent.lower()]
    if sentiment:
        calls = [c for c in calls if c["sentiment"] == sentiment.lower()]
    return calls[:limit]


@app.get("/api/calls/{call_id}")
def get_call(call_id: str):
    for c in _load_calls():
        if c["id"] == call_id:
            return c
    raise HTTPException(404, "Call not found")


@app.get("/api/metrics/summary")
def metrics_summary():
    calls = _load_calls()
    if not calls:
        return {}
    total = len(calls)
    avg_duration = sum(c["duration_sec"] for c in calls) / total
    avg_sentiment = sum(c["sentiment_score"] for c in calls) / total
    avg_booking = sum(c["booking_rate"] for c in calls) / total
    by_sentiment = {}
    for c in calls:
        by_sentiment[c["sentiment"]] = by_sentiment.get(c["sentiment"], 0) + 1
    return {
        "total_calls": total,
        "avg_duration_sec": round(avg_duration, 1),
        "avg_sentiment_score": round(avg_sentiment, 2),
        "avg_booking_rate": round(avg_booking, 2),
        "sentiment_breakdown": by_sentiment,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/agents")
def list_agents():
    agents: dict[str, int] = {}
    for c in _load_calls():
        agents[c["agent"]] = agents.get(c["agent"], 0) + 1
    return [{"name": k, "call_count": v} for k, v in sorted(agents.items())]


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    return _mock_analyze(req.transcript)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8001)
