from fastapi import APIRouter

from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analysis_service import AnalysisService

router = APIRouter(prefix="/analyze", tags=["analyze"])
service = AnalysisService()


@router.post("", response_model=AnalyzeResponse)
def analyze_transcript(request: AnalyzeRequest) -> AnalyzeResponse:
    return service.analyze_transcript(request)
