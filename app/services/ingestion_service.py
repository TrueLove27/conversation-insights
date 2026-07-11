from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from app.db.store import get_database
from app.models.schemas import (
    AnalyzeRequest,
    CallIngestRequest,
    CallOutcome,
    CallRecord,
    IngestionEvent,
    IngestionResult,
    SentimentLabel,
)
from app.repositories.call_repository import CallRepository
from app.services.analysis_service import AnalysisService


class IngestionService:
    def __init__(
        self,
        call_repository: CallRepository | None = None,
        analysis_service: AnalysisService | None = None,
    ):
        self._calls = call_repository or CallRepository()
        self._analysis = analysis_service or AnalysisService()
        self._db = get_database()

    def ingest(self, request: CallIngestRequest, source: str = "api") -> IngestionResult:
        try:
            analysis = self._analysis.analyze_transcript(
                AnalyzeRequest(
                    transcript=request.transcript,
                    agent_id=request.agent_id,
                    customer_name=request.customer_name,
                )
            )

            call_id = request.external_id or f"call-{uuid4().hex[:8]}"
            outcome = CallOutcome.BOOKED if analysis.booking_intent else CallOutcome.NOT_BOOKED

            call = CallRecord(
                id=call_id,
                agent_id=request.agent_id,
                customer_name=request.customer_name,
                phone_number=request.phone_number or "",
                started_at=request.started_at or datetime.utcnow(),
                duration_seconds=request.duration_seconds or max(60, len(request.transcript.split()) * 2),
                outcome=outcome,
                sentiment=analysis.sentiment,
                sentiment_score=analysis.sentiment_score,
                booking_intent=analysis.booking_intent,
                transcript=request.transcript,
                keywords=analysis.keywords,
                summary=analysis.summary,
                language=request.language or "en",
            )

            self._calls.insert(call, source=source)
            event_id = self._db.log_ingestion(
                source=source,
                status="success",
                payload=request.model_dump(mode="json"),
                call_id=call.id,
                external_id=request.external_id,
            )

            return IngestionResult(
                success=True,
                call_id=call.id,
                event_id=event_id,
                analysis=analysis,
            )
        except Exception as exc:  # noqa: BLE001
            event_id = self._db.log_ingestion(
                source=source,
                status="failed",
                payload=request.model_dump(mode="json"),
                external_id=request.external_id,
                error=str(exc),
            )
            return IngestionResult(success=False, event_id=event_id, error=str(exc))

    def list_events(self, limit: int = 50) -> list[IngestionEvent]:
        rows = self._db.list_ingestion_events(limit=limit)
        return [IngestionEvent.model_validate(row) for row in rows]
