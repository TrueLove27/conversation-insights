"""Shared analyze orchestration (rules + Groq + RAG enrichment)."""

from __future__ import annotations

import logging

from app.clients.rag_client import get_rag_client
from app.core.config import get_settings
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, RagCitation
from app.services.analysis_service import AnalysisService
from app.services.llm_client import analyze_with_groq

logger = logging.getLogger(__name__)
_rules = AnalysisService()


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


async def run_analysis(body: AnalyzeRequest) -> AnalyzeResponse:
    settings = get_settings()
    rag_context_str: str | None = None
    similar: list[RagCitation] = []
    playbooks: list[RagCitation] = []
    compliance_flags: list[str] = []
    escalation_required = False
    suggested_script: str | None = None
    rag_used = False
    rag_degraded = False
    rag_warnings: list[str] = []

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
            rag_used = True
        except Exception as exc:
            rag_degraded = True
            warning = "RAG context unavailable"
            rag_warnings.append(warning)
            logger.warning("%s: %s", warning, exc)

        try:
            compliance = await get_rag_client().scan_compliance(body.transcript)
            compliance_flags = compliance.get("flags", [])
            escalation_required = compliance.get("escalation_required", False)
            if compliance.get("recommendation"):
                compliance_flags.append(compliance["recommendation"])
            rag_used = True
        except Exception as exc:
            rag_degraded = True
            warning = "Compliance scan unavailable"
            rag_warnings.append(warning)
            logger.warning("%s: %s", warning, exc)

        try:
            script = await get_rag_client().suggest_script(body.transcript, body.industry)
            suggested_script = script.get("suggested_script")
            rag_used = True
        except Exception as exc:
            rag_degraded = True
            warning = "Script suggestion unavailable"
            rag_warnings.append(warning)
            logger.warning("%s: %s", warning, exc)

    llm_result = await analyze_with_groq(body.transcript, body.agent_id, rag_context_str)
    if llm_result:
        llm_result.playbook_citations = playbooks
        llm_result.similar_calls = similar
        llm_result.compliance_flags = compliance_flags
        llm_result.escalation_required = escalation_required
        llm_result.suggested_script = suggested_script
        llm_result.rag_used = rag_used
        llm_result.rag_degraded = rag_degraded
        llm_result.rag_warnings = rag_warnings
        if rag_context_str:
            llm_result.analysis_source = "llm+rag"
        return llm_result

    result = _rules.analyze_transcript(body)
    result.playbook_citations = playbooks
    result.similar_calls = similar
    result.compliance_flags = compliance_flags
    result.escalation_required = escalation_required
    result.suggested_script = suggested_script
    result.rag_used = rag_used
    result.rag_degraded = rag_degraded
    result.rag_warnings = rag_warnings
    if rag_context_str:
        result.analysis_source = "rules+rag"
    return result
