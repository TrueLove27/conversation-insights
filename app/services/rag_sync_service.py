"""Background RAG re-index scheduling with debounce."""

from __future__ import annotations

import asyncio
import logging
import time

from app.clients.rag_client import get_rag_client
from app.core.config import get_settings

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()
_sync_running = False
_pending_reason: str | None = None
_last_scheduled_at = 0.0
_DEBOUNCE_SECONDS = 5.0


async def _run_sync(reason: str) -> None:
    global _sync_running, _pending_reason
    try:
        logger.info("RAG sync starting reason=%s", reason)
        result = await get_rag_client().sync_all()
        logger.info("RAG sync completed reason=%s result=%s", reason, result.get("message", "ok") if isinstance(result, dict) else "ok")
    except Exception as exc:  # noqa: BLE001
        logger.warning("RAG sync failed reason=%s error=%s", reason, exc)
    finally:
        async with _lock:
            _sync_running = False
            pending = _pending_reason
            _pending_reason = None
        if pending:
            schedule_rag_sync(pending)


def schedule_rag_sync(reason: str) -> bool:
    """
    Schedule a non-blocking rag-service sync_all.
    Returns True if a sync was scheduled (or queued behind an in-flight sync).
    """
    global _sync_running, _pending_reason, _last_scheduled_at

    settings = get_settings()
    if not settings.rag_sync_on_ingest:
        logger.debug("RAG sync skipped (RAG_SYNC_ON_INGEST=false) reason=%s", reason)
        return False

    now = time.monotonic()
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.warning("RAG sync not scheduled (no event loop) reason=%s", reason)
        return False

    # Debounce bursts: if we just scheduled, queue as pending instead of starting another
    if _sync_running:
        _pending_reason = reason
        logger.info("RAG sync queued behind in-flight run reason=%s", reason)
        return True

    if now - _last_scheduled_at < _DEBOUNCE_SECONDS and _last_scheduled_at > 0:
        _pending_reason = reason
        logger.info("RAG sync debounced reason=%s", reason)
        # Ensure a follow-up task will drain pending after debounce window
        async def _drain_after_debounce() -> None:
            await asyncio.sleep(_DEBOUNCE_SECONDS)
            async with _lock:
                pending = _pending_reason
                running = _sync_running
            if pending and not running:
                schedule_rag_sync(pending)

        loop.create_task(_drain_after_debounce())
        return True

    _sync_running = True
    _last_scheduled_at = now
    loop.create_task(_run_sync(reason))
    logger.info("RAG sync scheduled reason=%s", reason)
    return True
