"""Background job runners backed by live call/agent data."""

from __future__ import annotations

import asyncio
import logging
from collections import Counter
from datetime import UTC, datetime
from typing import Any

from app.core.config import get_settings
from app.models.schemas import (
    AnalyzeRequest,
    CallFilterParams,
    JobCreateRequest,
    JobRecord,
    JobStatus,
    JobType,
)
from app.repositories.call_repository import CallRepository
from app.repositories.job_repository import JobRepository
from app.services.analysis_service import AnalysisService
from app.services.analytics_service import AnalyticsService

logger = logging.getLogger(__name__)

MAX_BATCH_CALLS = 50
PROGRESS_YIELD_SECONDS = 0.05


def _utc_now() -> datetime:
    return datetime.now(UTC)


class JobService:
    def __init__(
        self,
        job_repository: JobRepository | None = None,
        analysis_service: AnalysisService | None = None,
        call_repository: CallRepository | None = None,
        analytics_service: AnalyticsService | None = None,
    ):
        self._jobs = job_repository or JobRepository()
        self._analysis = analysis_service or AnalysisService()
        self._calls = call_repository or CallRepository()
        self._analytics = analytics_service or AnalyticsService()
        self._settings = get_settings()
        self._running_tasks: set[str] = set()

    def list_jobs(self, status: JobStatus | None = None) -> list[JobRecord]:
        jobs = self._jobs.find_all()
        if status:
            return [job for job in jobs if job.status == status]
        return jobs

    def get_job(self, job_id: str) -> JobRecord | None:
        return self._jobs.find_by_id(job_id)

    def enqueue(self, request: JobCreateRequest) -> JobRecord:
        job = self._jobs.create(request)
        asyncio.create_task(self._run_job(job.id))
        return job

    async def _run_job(self, job_id: str) -> None:
        if job_id in self._running_tasks:
            return
        self._running_tasks.add(job_id)

        try:
            job = self._jobs.find_by_id(job_id)
            if not job:
                return

            job.status = JobStatus.RUNNING
            job.started_at = _utc_now()
            job.progress = 5
            self._jobs.update(job)

            await asyncio.sleep(PROGRESS_YIELD_SECONDS)
            job = self._jobs.find_by_id(job_id)
            if not job:
                return
            job.progress = 35
            self._jobs.update(job)

            result = await asyncio.to_thread(self._build_result, job)

            await asyncio.sleep(PROGRESS_YIELD_SECONDS)
            job = self._jobs.find_by_id(job_id)
            if not job:
                return
            job.progress = 85
            self._jobs.update(job)

            job.result = result
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.completed_at = _utc_now()
            self._jobs.update(job)
            logger.info("job completed id=%s type=%s", job_id, job.job_type.value)
        except Exception as exc:  # noqa: BLE001
            logger.warning("job failed id=%s error=%s", job_id, exc)
            job = self._jobs.find_by_id(job_id)
            if job:
                job.status = JobStatus.FAILED
                job.error = str(exc)
                job.completed_at = _utc_now()
                self._jobs.update(job)
        finally:
            self._running_tasks.discard(job_id)

    def _build_result(self, job: JobRecord) -> dict[str, Any]:
        if job.job_type == JobType.TRANSCRIPT_ANALYSIS:
            return self._result_transcript_analysis(job)
        if job.job_type == JobType.BATCH_ANALYSIS:
            return self._result_batch_analysis(job)
        if job.job_type == JobType.AGENT_REPORT:
            return self._result_agent_report(job)
        if job.job_type == JobType.KEYWORD_EXTRACTION:
            return self._result_keyword_extraction(job)
        return {"message": "Job completed successfully"}

    def _result_transcript_analysis(self, job: JobRecord) -> dict[str, Any]:
        transcript = str(job.payload.get("transcript", "") or "")
        if len(transcript) < 10:
            raise ValueError("transcript_analysis requires payload.transcript (min 10 chars)")
        analysis = self._analysis.analyze_transcript(
            AnalyzeRequest(transcript=transcript, agent_id=job.payload.get("agent_id"))
        )
        return analysis.model_dump(mode="json")

    def _result_batch_analysis(self, job: JobRecord) -> dict[str, Any]:
        raw_ids = job.payload.get("call_ids") or []
        if not isinstance(raw_ids, list):
            raise ValueError("batch_analysis requires payload.call_ids as a list")
        call_ids = [str(cid) for cid in raw_ids][:MAX_BATCH_CALLS]

        results: list[dict[str, Any]] = []
        failed: list[dict[str, str]] = []
        sentiment_scores: list[float] = []

        for call_id in call_ids:
            call = self._calls.find_by_id(call_id)
            if not call:
                failed.append({"call_id": call_id, "error": "not_found"})
                continue
            try:
                analysis = self._analysis.analyze_transcript(
                    AnalyzeRequest(
                        transcript=call.transcript,
                        agent_id=call.agent_id,
                        customer_name=call.customer_name,
                    )
                )
                results.append(
                    {
                        "call_id": call_id,
                        "sentiment": analysis.sentiment.value,
                        "sentiment_score": analysis.sentiment_score,
                        "booking_intent": analysis.booking_intent,
                        "analysis_source": analysis.analysis_source,
                    }
                )
                sentiment_scores.append(analysis.sentiment_score)
            except Exception as exc:  # noqa: BLE001
                failed.append({"call_id": call_id, "error": str(exc)})

        avg_sentiment = (
            round(sum(sentiment_scores) / len(sentiment_scores), 4) if sentiment_scores else 0.0
        )
        return {
            "processed": len(results),
            "failed": len(failed),
            "failed_items": failed,
            "avg_sentiment": avg_sentiment,
            "results": results,
        }

    def _result_agent_report(self, job: JobRecord) -> dict[str, Any]:
        agent_id = str(job.payload.get("agent_id") or "").strip()
        if not agent_id:
            raise ValueError("agent_report requires payload.agent_id")
        metrics = self._analytics.get_agent_metrics(agent_id)
        if not metrics:
            raise ValueError(f"Agent '{agent_id}' not found")
        agent = metrics.agent
        return {
            "agent_id": agent.id,
            "name": agent.name,
            "team": agent.team,
            "calls": agent.total_calls,
            "booking_rate": agent.booking_rate,
            "avg_sentiment": agent.avg_sentiment_score,
            "recent_call_ids": [call.id for call in metrics.recent_calls],
            "outcome_breakdown": metrics.outcome_breakdown,
            "generated_at": _utc_now().isoformat(),
        }

    def _result_keyword_extraction(self, job: JobRecord) -> dict[str, Any]:
        raw_ids = job.payload.get("call_ids")
        counter: Counter[str] = Counter()
        categories: dict[str, str] = {}
        scanned = 0

        if isinstance(raw_ids, list) and raw_ids:
            call_ids = [str(cid) for cid in raw_ids][:MAX_BATCH_CALLS]
            for call_id in call_ids:
                call = self._calls.find_by_id(call_id)
                if not call:
                    continue
                scanned += 1
                for hit in call.keywords:
                    counter[hit.term] += hit.count
                    categories[hit.term] = hit.category
        else:
            calls, _ = self._calls.find_filtered(CallFilterParams(limit=50, offset=0))
            for call in calls:
                scanned += 1
                for hit in call.keywords:
                    counter[hit.term] += hit.count
                    categories[hit.term] = hit.category

        top = [
            {"term": term, "count": count, "category": categories.get(term, "general")}
            for term, count in counter.most_common(15)
        ]
        return {"scanned_calls": scanned, "keywords": top}
