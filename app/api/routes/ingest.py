import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app.core.auth import verify_api_key
from app.core.config import get_settings
from app.core.limiter import limiter
from app.models.schemas import CallIngestRequest, IngestionEvent, IngestionResult
from app.services.ingestion_service import IngestionService
from app.services.rag_sync_service import schedule_rag_sync

router = APIRouter(prefix="/ingest", tags=["ingest"])
service = IngestionService()
logger = logging.getLogger(__name__)


@router.post("/call", response_model=IngestionResult)
@limiter.limit("40/minute")
async def ingest_call(
    request: Request,
    body: CallIngestRequest,
    source: str = Query(default="api"),
    _: None = Depends(verify_api_key),
) -> IngestionResult:
    logger.info("ingest_call agent_id=%s source=%s", body.agent_id, source)
    result = service.ingest(body, source=source)
    if not result.success:
        logger.warning("ingest_call failed: %s", result.error)
        raise HTTPException(status_code=422, detail=result.error)
    result.rag_sync_scheduled = schedule_rag_sync(f"ingest:{result.call_id}")
    logger.info(
        "ingest_call success call_id=%s rag_sync_scheduled=%s",
        result.call_id,
        result.rag_sync_scheduled,
    )
    return result


@router.post("/webhook", response_model=IngestionResult)
@limiter.limit("40/minute")
async def webhook_ingest(
    request: Request,
    body: CallIngestRequest,
    x_webhook_secret: str | None = Header(default=None),
) -> IngestionResult:
    settings = get_settings()
    if settings.webhook_secret and x_webhook_secret != settings.webhook_secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")
    result = service.ingest(body, source="webhook")
    if not result.success:
        raise HTTPException(status_code=422, detail=result.error)
    result.rag_sync_scheduled = schedule_rag_sync(f"webhook:{result.call_id}")
    return result


@router.get("/events", response_model=list[IngestionEvent])
def list_ingestion_events(
    limit: int = Query(default=50, ge=1, le=200),
    _: None = Depends(verify_api_key),
) -> list[IngestionEvent]:
    return service.list_events(limit=limit)
