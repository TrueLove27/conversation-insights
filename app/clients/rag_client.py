"""HTTP client for rag-service."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


class RagClient:
    def __init__(self) -> None:
        self._settings = get_settings()
        self._base = self._settings.rag_service_url.rstrip("/")

    async def status(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.get(f"{self._base}/api/v1/status")
            r.raise_for_status()
            return r.json()

    async def query_playbook(self, question: str, top_k: int = 5) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            r = await client.post(
                f"{self._base}/api/v1/query/playbook",
                json={"question": question, "top_k": top_k},
            )
            r.raise_for_status()
            return r.json()

    async def search_transcripts(self, question: str, top_k: int = 5) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{self._base}/api/v1/search/transcripts",
                json={"question": question, "top_k": top_k},
            )
            r.raise_for_status()
            return r.json()

    async def context_for_analysis(self, transcript: str, industry: str | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                f"{self._base}/api/v1/context/for-analysis",
                json={"transcript": transcript, "industry": industry},
            )
            r.raise_for_status()
            return r.json()


_rag: RagClient | None = None


def get_rag_client() -> RagClient:
    global _rag
    if _rag is None:
        _rag = RagClient()
    return _rag
