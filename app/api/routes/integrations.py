from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.limiter import limiter
from app.db.store import get_database
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, IntegrationStatusResponse
from app.services.analysis_service import AnalysisService
from app.services.llm_client import groq_status

router = APIRouter(prefix="/integrations", tags=["integrations"])
service = AnalysisService()


@router.get("/status", response_model=IntegrationStatusResponse)
def integration_status() -> IntegrationStatusResponse:
    settings = get_settings()
    return IntegrationStatusResponse(
        database=get_database().stats(),
        groq=groq_status(),
        webhook={
            "configured": bool(settings.webhook_secret),
            "status": "ready" if settings.webhook_secret else "optional",
        },
        ingest_api_key_configured=bool(settings.ingest_api_key),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_with_integration(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    from app.services.llm_client import analyze_with_groq

    llm_result = await analyze_with_groq(body.transcript, body.agent_id)
    if llm_result:
        return llm_result
    return service.analyze_transcript(body)
