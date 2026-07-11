from datetime import datetime
from uuid import uuid4

from app.core.config import Settings, get_settings
from app.core.database import JsonStore
from app.models.schemas import JobCreateRequest, JobRecord, JobStatus


class JobRepository:
    def __init__(self, settings: Settings | None = None):
        self._settings = settings or get_settings()
        self._store = JsonStore[dict](self._settings.data_dir / self._settings.jobs_file, default=[])

    def find_all(self) -> list[JobRecord]:
        jobs = [JobRecord.model_validate(item) for item in self._store.read_all()]
        return sorted(jobs, key=lambda job: job.created_at, reverse=True)

    def find_by_id(self, job_id: str) -> JobRecord | None:
        for item in self.find_all():
            if item.id == job_id:
                return item
        return None

    def create(self, request: JobCreateRequest) -> JobRecord:
        job = JobRecord(
            id=str(uuid4()),
            job_type=request.job_type,
            status=JobStatus.PENDING,
            created_at=datetime.utcnow(),
            payload=request.payload,
        )
        jobs = self.find_all()
        jobs.insert(0, job)
        self.save_all(jobs)
        return job

    def update(self, job: JobRecord) -> JobRecord:
        jobs = self.find_all()
        updated: list[JobRecord] = []
        found = False
        for existing in jobs:
            if existing.id == job.id:
                updated.append(job)
                found = True
            else:
                updated.append(existing)
        if not found:
            updated.insert(0, job)
        self.save_all(updated)
        return job

    def save_all(self, jobs: list[JobRecord]) -> None:
        payload = [job.model_dump(mode="json") for job in jobs]
        self._store.write_all(payload)

    def file_exists(self) -> bool:
        return (self._settings.data_dir / self._settings.jobs_file).exists()
