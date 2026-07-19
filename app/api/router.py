from fastapi import APIRouter

from app.api.routes import (
    agents,
    analytics,
    analyze,
    calls,
    health,
    ingest,
    integrations,
    jobs,
    knowledge,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(calls.router)
api_router.include_router(analytics.router)
api_router.include_router(agents.router)
api_router.include_router(jobs.router)
api_router.include_router(analyze.router)
api_router.include_router(ingest.router)
api_router.include_router(integrations.router)
api_router.include_router(knowledge.router)
