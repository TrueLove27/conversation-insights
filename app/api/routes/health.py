from datetime import datetime

from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import HealthResponse
from app.repositories.agent_repository import AgentRepository
from app.repositories.call_repository import CallRepository
from app.repositories.job_repository import JobRepository

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    settings = get_settings()
    call_repo = CallRepository(settings)
    agent_repo = AgentRepository(settings)
    job_repo = JobRepository(settings)

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        timestamp=datetime.utcnow(),
        data_files={
            "calls": call_repo.file_exists(),
            "agents": agent_repo.file_exists(),
            "jobs": job_repo.file_exists(),
        },
    )
