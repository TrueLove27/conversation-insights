from fastapi import APIRouter, Request

from app.core.limiter import limiter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analyze_orchestrator import run_analysis

router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_transcript(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    return await run_analysis(body)
