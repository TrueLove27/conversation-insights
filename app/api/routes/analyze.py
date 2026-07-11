from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.core.limiter import limiter
from app.models.schemas import AnalyzeRequest, AnalyzeResponse
from app.services.analysis_service import AnalysisService
from app.services.llm_client import analyze_with_groq
from app.clients.rag_client import get_rag_client
from app.api.routes.knowledge import citations_from_rag

router = APIRouter(prefix="/analyze", tags=["analyze"])
service = AnalysisService()


@router.post("", response_model=AnalyzeResponse)
@limiter.limit("20/minute")
async def analyze_transcript(request: Request, body: AnalyzeRequest) -> AnalyzeResponse:
    settings = get_settings()
    rag_context_str: str | None = None
    similar: list = []
    playbooks: list = []

    if body.use_rag_context and settings.enable_rag_context:
        try:
            rag_raw = await get_rag_client().context_for_analysis(body.transcript, body.industry)
            similar, playbooks = citations_from_rag(rag_raw)
            parts = []
            for s in rag_raw.get("playbook_excerpts", []):
                parts.append(f"[Playbook: {s.get('document_name')}] {s.get('text', '')[:200]}")
            for s in rag_raw.get("similar_calls", []):
                parts.append(f"[Similar call: {s.get('document_name')}] {s.get('text', '')[:200]}")
            rag_context_str = "\n".join(parts) if parts else None
        except Exception:
            pass

    llm_result = await analyze_with_groq(body.transcript, body.agent_id, rag_context_str)
    if llm_result:
        llm_result.playbook_citations = playbooks
        llm_result.similar_calls = similar
        return llm_result

    result = service.analyze_transcript(body)
    result.playbook_citations = playbooks
    result.similar_calls = similar
    if rag_context_str:
        result.analysis_source = "rules+rag"
    return result
