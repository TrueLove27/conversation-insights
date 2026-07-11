import asyncio
import random
from datetime import datetime

from app.core.config import get_settings
from app.models.schemas import JobCreateRequest, JobRecord, JobStatus, JobType
from app.repositories.job_repository import JobRepository
from app.services.analysis_service import AnalysisService


class JobService:
    def __init__(
        self,
        job_repository: JobRepository | None = None,
        analysis_service: AnalysisService | None = None,
    ):
        self._jobs = job_repository or JobRepository()
        self._analysis = analysis_service or AnalysisService()
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
        asyncio.create_task(self._simulate_job(job.id))
        return job

    async def _simulate_job(self, job_id: str) -> None:
        if job_id in self._running_tasks:
            return
        self._running_tasks.add(job_id)

        try:
            job = self._jobs.find_by_id(job_id)
            if not job:
                return

            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            job.progress = 5
            self._jobs.update(job)

            steps = self._settings.job_simulation_steps
            for step in range(1, steps + 1):
                await asyncio.sleep(self._settings.job_poll_interval_seconds)
                job = self._jobs.find_by_id(job_id)
                if not job:
                    return
                job.progress = min(95, int((step / steps) * 90) + 5)
                self._jobs.update(job)

            job = self._jobs.find_by_id(job_id)
            if not job:
                return

            job.result = self._build_result(job)
            job.status = JobStatus.COMPLETED
            job.progress = 100
            job.completed_at = datetime.utcnow()
            self._jobs.update(job)
        except Exception as exc:  # noqa: BLE001
            job = self._jobs.find_by_id(job_id)
            if job:
                job.status = JobStatus.FAILED
                job.error = str(exc)
                job.completed_at = datetime.utcnow()
                self._jobs.update(job)
        finally:
            self._running_tasks.discard(job_id)

    def _build_result(self, job: JobRecord) -> dict:
        if job.job_type == JobType.TRANSCRIPT_ANALYSIS:
            transcript = job.payload.get("transcript", "")
            from app.models.schemas import AnalyzeRequest

            analysis = self._analysis.analyze_transcript(
                AnalyzeRequest(transcript=transcript, agent_id=job.payload.get("agent_id"))
            )
            return analysis.model_dump(mode="json")

        if job.job_type == JobType.BATCH_ANALYSIS:
            call_ids = job.payload.get("call_ids", [])
            return {
                "processed": len(call_ids),
                "avg_sentiment": round(random.uniform(0.1, 0.8), 4),
                "flagged_calls": random.randint(0, max(1, len(call_ids) // 5)),
            }

        if job.job_type == JobType.AGENT_REPORT:
            agent_id = job.payload.get("agent_id", "unknown")
            return {
                "agent_id": agent_id,
                "report_url": f"/reports/agents/{agent_id}/summary.pdf",
                "generated_at": datetime.utcnow().isoformat(),
            }

        if job.job_type == JobType.KEYWORD_EXTRACTION:
            return {
                "keywords": [
                    {"term": "appointment", "count": 12},
                    {"term": "pricing", "count": 8},
                    {"term": "support", "count": 6},
                ]
            }

        return {"message": "Job completed successfully"}
