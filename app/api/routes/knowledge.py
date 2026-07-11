from fastapi import APIRouter, HTTPException, Query

from app.clients.rag_client import get_rag_client
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, RagCitation
from app.services.corpus_sync_service import CorpusSyncService

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
_corpus = CorpusSyncService()


@router.post("/ask", response_model=dict)
async def ask_playbook(body: dict) -> dict:
    question = body.get("question", "").strip()
    if len(question) < 3:
        raise HTTPException(status_code=400, detail="Question too short")
    try:
        return await get_rag_client().query_playbook(question, top_k=body.get("top_k", 5))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/similar-calls", response_model=dict)
async def similar_calls(body: dict) -> dict:
    question = body.get("question", "").strip()
    if len(question) < 3:
        raise HTTPException(status_code=400, detail="Query too short")
    try:
        return await get_rag_client().search_transcripts(question, top_k=body.get("top_k", 5))
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"RAG service unavailable: {exc}") from exc


@router.post("/import-corpus")
async def import_corpus(
    industry: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=500),
) -> dict:
    try:
        return await _corpus.import_calls(industry=industry, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Corpus service unavailable: {exc}") from exc


def citations_from_rag(raw: dict) -> tuple[list[RagCitation], list[RagCitation]]:
    similar = [
        RagCitation(
            document_id=s.get("document_id", ""),
            document_name=s.get("document_name", ""),
            text=s.get("text", "")[:300],
            score=float(s.get("score", 0)),
        )
        for s in raw.get("similar_calls", [])
    ]
    playbooks = [
        RagCitation(
            document_id=s.get("document_id", ""),
            document_name=s.get("document_name", ""),
            text=s.get("text", "")[:300],
            score=float(s.get("score", 0)),
        )
        for s in raw.get("playbook_excerpts", [])
    ]
    return similar, playbooks
