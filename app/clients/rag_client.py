"""HTTP client for rag-service."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class RagClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._base = self._settings.rag_service_url.rstrip("/")

    async def _post(self, path: str, payload: dict, timeout: float = 120.0) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.post(f"{self._base}/api/v1{path}", json=payload)
            r.raise_for_status()
            return r.json()

    async def _get(self, path: str, timeout: float = 30.0) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=timeout) as client:
            r = await client.get(f"{self._base}/api/v1{path}")
            r.raise_for_status()
            return r.json()

    async def status(self) -> dict[str, Any]:
        return await self._get("/status", timeout=10.0)

    async def sync_all(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=600.0) as client:
            r = await client.post(f"{self._base}/api/v1/sync/all")
            r.raise_for_status()
            return r.json()

    async def query_playbook(
        self,
        question: str,
        top_k: int = 5,
        retrieval_only: bool = False,
        category: str | None = None,
    ) -> dict[str, Any]:
        return await self._post(
            "/query/playbook",
            {"question": question, "top_k": top_k, "retrieval_only": retrieval_only, "category": category},
        )

    async def search_transcripts(self, question: str, top_k: int = 5) -> dict[str, Any]:
        return await self._post("/search/transcripts", {"question": question, "top_k": top_k})

    async def context_for_analysis(self, transcript: str, industry: str | None = None) -> dict[str, Any]:
        return await self._post("/context/for-analysis", {"transcript": transcript, "industry": industry}, timeout=60.0)

    async def scan_compliance(self, transcript: str) -> dict[str, Any]:
        return await self._post("/scan/compliance", {"transcript": transcript}, timeout=30.0)

    async def suggest_script(self, transcript: str, industry: str | None = None) -> dict[str, Any]:
        return await self._post("/suggest/script", {"transcript": transcript, "industry": industry})

    async def pre_call_brief(
        self, agent_id: str, industry: str | None = None, specialties: list[str] | None = None
    ) -> dict[str, Any]:
        return await self._post(
            "/brief/pre-call",
            {"agent_id": agent_id, "industry": industry, "specialties": specialties or []},
        )

    async def match_best_practices(self, question: str, industry: str | None = None) -> dict[str, Any]:
        return await self._post("/match/best-practices", {"question": question, "industry": industry})

    async def topic_insights(self, industry: str | None = None) -> dict[str, Any]:
        suffix = f"?industry={industry}" if industry else ""
        return await self._get(f"/insights/topics{suffix}")

    async def agent_digest(self, agent_id: str, industry: str | None = None) -> dict[str, Any]:
        return await self._post("/digest/agent", {"agent_id": agent_id, "industry": industry})


_rag: RagClient | None = None


def get_rag_client() -> RagClient:
    global _rag
    if _rag is None:
        _rag = RagClient()
    return _rag
