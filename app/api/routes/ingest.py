from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request

from app.core.config import get_settings
from app.core.limiter import limiter
from app.models.schemas import CallIngestRequest, IngestionEvent, IngestionResult
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/ingest", tags=["ingest"])
service = IngestionService()


def _verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if x_api_key != get_settings().ingest_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")


@router.post("/call", response_model=IngestionResult)
@limiter.limit("40/minute")
async def ingest_call(
    request: Request,
    body: CallIngestRequest,
    source: str = Query(default="api"),
    _: None = Depends(_verify_api_key),
) -> IngestionResult:
    result = service.ingest(body, source=source)
    if not result.success:
        raise HTTPException(status_code=422, detail=result.error)
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
    return result


@router.get("/events", response_model=list[IngestionEvent])
def list_ingestion_events(limit: int = Query(default=50, ge=1, le=200)) -> list[IngestionEvent]:
    return service.list_events(limit=limit)
