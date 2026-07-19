from app.db.store import Database, get_database
from app.models.schemas import CallFilterParams, CallRecord, JobCreateRequest, JobRecord


class CallRepository:
    def __init__(self, db: Database | None = None):
        self._db = db or get_database()

    def find_all(self) -> list[CallRecord]:
        return self._db.list_calls()

    def find_filtered(self, filters: CallFilterParams) -> tuple[list[CallRecord], int]:
        return self._db.list_calls_filtered(filters)

    def find_by_id(self, call_id: str) -> CallRecord | None:
        return self._db.get_call(call_id)

    def insert(self, call: CallRecord, source: str = "api") -> CallRecord:
        return self._db.insert_call(call, source=source)

    def count(self) -> int:
        return self._db.stats()["calls"]

    def file_exists(self) -> bool:
        return self._db.stats()["calls"] > 0


class AgentRepository:
    def __init__(self, db: Database | None = None):
        self._db = db or get_database()

    def find_all(self):
        return self._db.list_agents()

    def find_by_id(self, agent_id: str):
        return self._db.get_agent(agent_id)

    def file_exists(self) -> bool:
        return self._db.stats()["agents"] > 0


class JobRepository:
    def __init__(self, db: Database | None = None):
        self._db = db or get_database()

    def find_all(self) -> list[JobRecord]:
        return self._db.list_jobs()

    def find_by_id(self, job_id: str) -> JobRecord | None:
        return self._db.get_job(job_id)

    def create(self, request: JobCreateRequest) -> JobRecord:
        return self._db.create_job(request)

    def update(self, job: JobRecord) -> JobRecord:
        return self._db.update_job(job)

    def file_exists(self) -> bool:
        return self._db.stats()["jobs"] > 0
