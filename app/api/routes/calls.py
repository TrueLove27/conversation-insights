from datetime import datetime

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    CallFilterParams,
    CallOutcome,
    CallRecord,
    PaginatedCalls,
    SentimentLabel,
)
from app.services.call_service import CallService

router = APIRouter(prefix="/calls", tags=["calls"])
service = CallService()


@router.get("", response_model=PaginatedCalls)
def list_calls(
    agent_id: str | None = None,
    outcome: CallOutcome | None = None,
    sentiment: SentimentLabel | None = None,
    search: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> PaginatedCalls:
    filters = CallFilterParams(
        agent_id=agent_id,
        outcome=outcome,
        sentiment=sentiment,
        search=search,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset,
    )
    return service.list_calls(filters)


@router.get("/{call_id}", response_model=CallRecord)
def get_call(call_id: str) -> CallRecord:
    call = service.get_call(call_id)
    if not call:
        raise HTTPException(status_code=404, detail=f"Call '{call_id}' not found")
    return call
