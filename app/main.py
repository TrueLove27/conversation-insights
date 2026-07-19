import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.router import api_router
from app.clients.rag_client import get_rag_client
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.logging import setup_logging, set_request_id
from app.db.store import get_database

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(debug=settings.debug)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        db = get_database()
        db.init_schema()
        db.seed_from_json_if_empty()
        logger.info("Talksmith API started version=%s", settings.app_version)
        yield
        await get_rag_client().aclose()
        logger.info("Talksmith API shutdown complete")

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
    async def request_context_middleware(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        set_request_id(request_id)
        started = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - started) * 1000
        response.headers["X-API-Version"] = settings.app_version
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "%s %s status=%s duration_ms=%.1f",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )
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
