import logging
from datetime import UTC, datetime

from fastapi import APIRouter

from app.clients.rag_client import get_rag_client
from app.core.config import get_settings
from app.db.store import get_database
from app.models.schemas import HealthResponse
from app.repositories.call_repository import AgentRepository, CallRepository, JobRepository
from app.services.llm_client import groq_status

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    settings = get_settings()
    db = get_database()

    rag_info: dict = {"reachable": False, "detail": "not checked"}
    try:
        status = await get_rag_client().status()
        rag_info = {
            "reachable": True,
            "detail": status.get("status", "ok") if isinstance(status, dict) else "ok",
        }
    except Exception as exc:
        rag_info = {"reachable": False, "detail": str(exc)[:200]}
        logger.warning("RAG health probe failed: %s", exc)

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=datetime.now(UTC),
        data_files={
            "calls": CallRepository().file_exists(),
            "agents": AgentRepository().file_exists(),
            "jobs": JobRepository().file_exists(),
        },
        database=db.stats(),
        integrations={
            "groq": groq_status(),
            "rag": rag_info,
        },
        rate_limits={
            "default": settings.rate_limit_default,
            "analyze": settings.rate_limit_analyze,
            "ingest": settings.rate_limit_ingest,
        },
    )
