from fastapi import APIRouter

from app.clients.rag_client import get_rag_client
from app.core.config import get_settings
from app.db.store import get_database
from app.models.schemas import IntegrationStatusResponse
from app.services.corpus_sync_service import CorpusSyncService
from app.services.llm_client import groq_status

router = APIRouter(prefix="/integrations", tags=["integrations"])
_corpus = CorpusSyncService()


@router.get("/status", response_model=IntegrationStatusResponse)
async def integration_status() -> IntegrationStatusResponse:
    settings = get_settings()
    rag_status: dict = {"status": "unreachable"}
    corpus_status: dict = {"status": "unreachable"}

    try:
        rag_status = await get_rag_client().status()
        rag_status["status"] = "connected"
    except Exception as exc:
        rag_status = {"status": "unreachable", "error": str(exc)}

    try:
        corpus_status = await _corpus.fetch_corpus_health()
        corpus_status["status"] = "connected"
    except Exception as exc:
        corpus_status = {"status": "unreachable", "error": str(exc)}

    return IntegrationStatusResponse(
        database=get_database().stats(),
        groq=groq_status(),
        webhook={
            "configured": bool(settings.webhook_secret),
            "status": "ready" if settings.webhook_secret else "optional",
        },
        ingest_api_key_configured=bool(settings.ingest_api_key),
        rag_service=rag_status,
        corpus_service=corpus_status,
    )
