from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.core.config import get_settings
from app.core.limiter import limiter
from app.db.store import get_database


def create_app() -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        db = get_database()
        db.init_schema()
        db.seed_from_json_if_empty()
        yield

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="AI voice call analytics with SQLite storage, ingestion pipeline, and LLM integrations.",
        lifespan=lifespan,
    )

    application.state.limiter = limiter
    limiter.default_limits = [settings.rate_limit_default]
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @application.middleware("http")
    async def add_api_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-API-Version"] = settings.app_version
        return response

    application.include_router(api_router, prefix=settings.api_prefix)

    @application.get("/")
    def root() -> dict[str, str]:
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "docs": "/docs",
            "health": f"{settings.api_prefix}/health",
        }

    return application


app = create_app()
