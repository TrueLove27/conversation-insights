import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.clients.rag_client import get_rag_client
from app.core.auth import verify_api_key
from app.core.limiter import limiter
from app.models.schemas import (
    AgentDigestRequest,
    AgentDigestResponse,
    BestPracticesRequest,
    ComplianceScanRequest,
    ComplianceScanResponse,
    ImportCorpusResponse,
    PlaybookAskRequest,
    PreCallBriefRequest,
    PreCallBriefResponse,
    RagQueryResponse,
    RagSyncResponse,
    SimilarCallsRequest,
    SuggestScriptRequest,
    SuggestScriptResponse,
    TopicsResponse,
)
from app.services.corpus_sync_service import CorpusSyncService
from app.services.rag_sync_service import schedule_rag_sync

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
_corpus = CorpusSyncService()
logger = logging.getLogger(__name__)


@router.post("/ask", response_model=RagQueryResponse)
@limiter.limit("30/minute")
async def ask_playbook(request: Request, body: PlaybookAskRequest) -> RagQueryResponse:
    try:
        raw = await get_rag_client().query_playbook(
            body.question.strip(),
            top_k=body.top_k,
            retrieval_only=body.retrieval_only,
            category=body.category,
        )
        return RagQueryResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/similar-calls", response_model=RagQueryResponse)
@limiter.limit("30/minute")
async def similar_calls(request: Request, body: SimilarCallsRequest) -> RagQueryResponse:
    try:
        raw = await get_rag_client().search_transcripts(body.question.strip(), top_k=body.top_k)
        return RagQueryResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/best-practices", response_model=RagQueryResponse)
@limiter.limit("30/minute")
async def best_practices(request: Request, body: BestPracticesRequest) -> RagQueryResponse:
    try:
        raw = await get_rag_client().match_best_practices(body.question.strip(), body.industry)
        return RagQueryResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/scan-compliance", response_model=ComplianceScanResponse)
@limiter.limit("20/minute")
async def scan_compliance(request: Request, body: ComplianceScanRequest) -> ComplianceScanResponse:
    try:
        raw = await get_rag_client().scan_compliance(body.transcript.strip())
        return ComplianceScanResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/suggest-script", response_model=SuggestScriptResponse)
@limiter.limit("20/minute")
async def suggest_script(request: Request, body: SuggestScriptRequest) -> SuggestScriptResponse:
    try:
        raw = await get_rag_client().suggest_script(body.transcript.strip(), body.industry)
        return SuggestScriptResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/pre-call-brief", response_model=PreCallBriefResponse)
@limiter.limit("30/minute")
async def pre_call_brief(request: Request, body: PreCallBriefRequest) -> PreCallBriefResponse:
    try:
        raw = await get_rag_client().pre_call_brief(
            body.agent_id.strip(), body.industry, body.specialties
        )
        return PreCallBriefResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.get("/topics", response_model=TopicsResponse)
async def topic_insights(industry: str | None = Query(default=None)) -> TopicsResponse:
    try:
        raw = await get_rag_client().topic_insights(industry)
        return TopicsResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/agent-digest", response_model=AgentDigestResponse)
@limiter.limit("30/minute")
async def agent_digest(request: Request, body: AgentDigestRequest) -> AgentDigestResponse:
    try:
        raw = await get_rag_client().agent_digest(body.agent_id.strip(), body.industry)
        return AgentDigestResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/sync-rag", response_model=RagSyncResponse)
@limiter.limit("10/minute")
async def sync_rag(request: Request, _: None = Depends(verify_api_key)) -> RagSyncResponse:
    try:
        raw = await get_rag_client().sync_all()
        return RagSyncResponse.model_validate(raw)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG sync failed: {exc}") from exc


@router.post("/import-corpus", response_model=ImportCorpusResponse)
@limiter.limit("10/minute")
async def import_corpus(
    request: Request,
    industry: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
    _: None = Depends(verify_api_key),
) -> ImportCorpusResponse:
    try:
        result = await _corpus.import_calls(industry=industry, limit=limit)
        scheduled = schedule_rag_sync(f"import-corpus:{result.get('imported', 0)}")
        result["rag_sync_scheduled"] = scheduled
        return ImportCorpusResponse.model_validate(result)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Corpus service unavailable: {exc}") from exc
