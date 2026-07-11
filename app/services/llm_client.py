"""Optional Groq LLM integration for enhanced transcript analysis."""

from __future__ import annotations

import json
from typing import Any

import httpx

from app.core.config import get_settings
from app.models.schemas import AnalyzeResponse, SentimentLabel


GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def analyze_with_groq(transcript: str, agent_id: str | None = None) -> AnalyzeResponse | None:
    settings = get_settings()
    if not settings.groq_api_key or not settings.enable_llm_analysis:
        return None

    system = (
        "You analyze sales/support call transcripts. Respond ONLY with valid JSON: "
        '{"sentiment":"positive|neutral|negative|mixed","sentiment_score":0.0,'
        '"booking_intent":true,"booking_confidence":0.0,"summary":"...",'
        '"topics":["..."],"risk_flags":["..."],"keywords":[{"term":"...","count":1,"category":"..."}]}'
    )
    user = f"Agent ID: {agent_id or 'unknown'}\n\nTranscript:\n{transcript[:6000]}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.groq_model,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
            data: dict[str, Any] = json.loads(content)
    except Exception:
        return None

    from app.models.schemas import KeywordHit, SentimentBreakdown

    pos = max(0.0, float(data.get("sentiment_score", 0)))
    return AnalyzeResponse(
        sentiment=SentimentLabel(data.get("sentiment", "neutral")),
        sentiment_score=float(data.get("sentiment_score", 0)),
        sentiment_breakdown=SentimentBreakdown(
            positive=pos if data.get("sentiment") == "positive" else 0.2,
            neutral=0.3,
            negative=0.1,
        ),
        booking_intent=bool(data.get("booking_intent", False)),
        booking_confidence=float(data.get("booking_confidence", 0.5)),
        keywords=[KeywordHit.model_validate(k) for k in data.get("keywords", [])[:8]],
        summary=str(data.get("summary", "LLM analysis completed.")),
        topics=list(data.get("topics", []))[:6],
        risk_flags=list(data.get("risk_flags", []))[:5],
    )


def groq_status() -> dict[str, Any]:
    settings = get_settings()
    configured = bool(settings.groq_api_key)
    return {
        "provider": "groq",
        "configured": configured,
        "model": settings.groq_model if configured else None,
        "status": "connected" if configured else "not_configured",
    }
