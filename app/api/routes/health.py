from datetime import datetime

from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import HealthResponse
from app.repositories.call_repository import AgentRepository, CallRepository, JobRepository
from app.services.llm_client import groq_status
from app.db.store import get_database

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    db = get_database()

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        data_files={
            "calls": CallRepository().file_exists(),
            "agents": AgentRepository().file_exists(),
            "jobs": JobRepository().file_exists(),
        },
        database=db.stats(),
        integrations={"groq": groq_status()},
        rate_limits={
            "default": settings.rate_limit_default,
            "analyze": settings.rate_limit_analyze,
            "ingest": settings.rate_limit_ingest,
        },
    )
