"""HTTP client for rag-service with shared connection reuse."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RagClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._base = self._settings.rag_service_url.rstrip("/")
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=120.0)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _post(self, path: str, payload: dict, timeout: float = 120.0) -> dict[str, Any]:
        url = f"{self._base}/api/v1{path}"
        try:
            r = await self._get_client().post(url, json=payload, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("RAG POST %s failed status=%s", path, exc.response.status_code)
            raise
        except httpx.HTTPError as exc:
            logger.warning("RAG POST %s connection error: %s", path, exc)
            raise

    async def _get(self, path: str, timeout: float = 30.0) -> dict[str, Any]:
        url = f"{self._base}/api/v1{path}"
        try:
            r = await self._get_client().get(url, timeout=timeout)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("RAG GET %s failed status=%s", path, exc.response.status_code)
            raise
        except httpx.HTTPError as exc:
            logger.warning("RAG GET %s connection error: %s", path, exc)
            raise

    async def status(self) -> dict[str, Any]:
        return await self._get("/status", timeout=10.0)

    async def sync_all(self) -> dict[str, Any]:
        url = f"{self._base}/api/v1/sync/all"
        try:
            r = await self._get_client().post(url, timeout=600.0)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("RAG sync_all failed status=%s", exc.response.status_code)
            raise
        except httpx.HTTPError as exc:
            logger.warning("RAG sync_all connection error: %s", exc)
            raise

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
