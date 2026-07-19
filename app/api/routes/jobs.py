from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.auth import verify_api_key
from app.models.schemas import JobCreateRequest, JobRecord, JobStatus
from app.services.job_service import JobService

router = APIRouter(prefix="/jobs", tags=["jobs"])
service = JobService()


@router.get("", response_model=list[JobRecord])
def list_jobs(status: JobStatus | None = Query(default=None)) -> list[JobRecord]:
    return service.list_jobs(status=status)


@router.get("/{job_id}", response_model=JobRecord)
def get_job(job_id: str) -> JobRecord:
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job


@router.post("", response_model=JobRecord, status_code=201)
async def create_job(
    request: JobCreateRequest,
    _: None = Depends(verify_api_key),
) -> JobRecord:
    return service.enqueue(request)
