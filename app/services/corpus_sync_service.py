"""Import calls from call-corpus-service into local SQLite."""

from __future__ import annotations

from datetime import datetime

import httpx

from app.core.config import get_settings
from app.db.store import get_database
from app.models.schemas import (
    AgentRecord,
    CallOutcome,
    CallRecord,
    KeywordHit,
    SentimentLabel,
)


class CorpusSyncService:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._base = self._settings.corpus_service_url.rstrip("/")

    async def fetch_corpus_health(self) -> dict:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self._base}/api/v1/health")
            r.raise_for_status()
            return r.json()

    async def _import_agents(self, client: httpx.AsyncClient) -> int:
        r = await client.get(f"{self._base}/api/v1/agents")
        r.raise_for_status()
        agents_raw = r.json()
        db = get_database()
        count = 0
        for raw in agents_raw:
            try:
                agent = AgentRecord(
                    id=raw["id"],
                    name=raw["name"],
                    team=raw.get("team", ""),
                    email=raw.get("email", ""),
                    active=raw.get("active", True),
                    hire_date=datetime.fromisoformat(raw["hire_date"].replace("Z", "+00:00")),
                    total_calls=raw.get("total_calls", 0),
                    avg_sentiment_score=raw.get("avg_sentiment_score", 0.0),
                    booking_rate=raw.get("booking_rate", 0.0),
                    avg_handle_time_seconds=raw.get("avg_handle_time_seconds", 0),
                    specialties=raw.get("specialties", []),
                )
                db.upsert_agent(agent)
                count += 1
            except Exception:
                continue
        return count

    async def import_calls(self, *, industry: str | None = None, limit: int = 100) -> dict:
        params: dict = {"limit": limit}
        if industry:
            params["industry"] = industry

        async with httpx.AsyncClient(timeout=60.0) as client:
            agents_imported = await self._import_agents(client)
            r = await client.get(f"{self._base}/api/v1/calls", params=params)
            r.raise_for_status()
            bundle = r.json()

        db = get_database()
        imported = 0
        skipped = 0
        for raw in bundle.get("items", []):
            try:
                call = CallRecord(
                    id=raw["id"],
                    agent_id=raw["agent_id"],
                    customer_name=raw["customer_name"],
                    phone_number=raw.get("phone_number", ""),
                    started_at=datetime.fromisoformat(raw["started_at"].replace("Z", "+00:00")),
                    duration_seconds=raw["duration_seconds"],
                    outcome=CallOutcome(raw["outcome"]),
                    sentiment=SentimentLabel(raw["sentiment"]),
                    sentiment_score=raw["sentiment_score"],
                    booking_intent=raw["booking_intent"],
                    transcript=raw["transcript"],
                    keywords=[KeywordHit(**k) for k in raw.get("keywords", [])],
                    summary=raw.get("summary", ""),
                    language=raw.get("language", "en"),
                )
                if db.get_call(call.id):
                    skipped += 1
                    continue
                db.insert_call(call, source="corpus-import")
                imported += 1
            except Exception:
                continue

        return {
            "imported": imported,
            "skipped": skipped,
            "agents_imported": agents_imported,
            "available": bundle.get("total", 0),
            "industry": industry,
        }
