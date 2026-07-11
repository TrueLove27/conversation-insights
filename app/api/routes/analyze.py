from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analysis_service import AnalysisService
from app.services.llm_client import analyze_with_groq

router = APIRouter(prefix="/analyze", tags=["analyze"])
service = AnalysisService()


@router.post("", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_transcript(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    llm_result = await analyze_with_groq(body.transcript, body.agent_id)
    if llm_result:
        return llm_result
    return service.analyze_transcript(body)
