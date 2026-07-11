"""SQLite persistence layer."""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator
from uuid import uuid4

from app.core.config import Settings, get_settings
from app.models.schemas import (
    AgentRecord,
    CallOutcome,
    CallRecord,
    JobCreateRequest,
    JobRecord,
    JobStatus,
    JobType,
    KeywordHit,
    SentimentLabel,
)


class Database:
    def __init__(self, settings: Settings | None = None):
        self._settings = settings or get_settings()
        self._path = Path(self._settings.db_path)
        self._lock = threading.RLock()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(self._path), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("PRAGMA journal_mode = WAL")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_schema(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    team TEXT,
                    email TEXT,
                    active INTEGER NOT NULL DEFAULT 1,
                    hire_date TEXT,
                    total_calls INTEGER DEFAULT 0,
                    avg_sentiment_score REAL DEFAULT 0,
                    booking_rate REAL DEFAULT 0,
                    avg_handle_time_seconds INTEGER DEFAULT 0,
                    specialties TEXT DEFAULT '[]'
                );

                CREATE TABLE IF NOT EXISTS calls (
                    id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    customer_name TEXT NOT NULL,
                    phone_number TEXT,
                    started_at TEXT NOT NULL,
                    duration_seconds INTEGER NOT NULL,
                    outcome TEXT NOT NULL,
                    sentiment TEXT NOT NULL,
                    sentiment_score REAL NOT NULL,
                    booking_intent INTEGER NOT NULL,
                    transcript TEXT NOT NULL,
                    keywords TEXT NOT NULL DEFAULT '[]',
                    summary TEXT,
                    language TEXT DEFAULT 'en',
                    source TEXT DEFAULT 'seed',
                    FOREIGN KEY (agent_id) REFERENCES agents(id)
                );

                CREATE TABLE IF NOT EXISTS jobs (
                    id TEXT PRIMARY KEY,
                    job_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    progress INTEGER DEFAULT 0,
                    payload TEXT DEFAULT '{}',
                    result TEXT,
                    error TEXT
                );

                CREATE TABLE IF NOT EXISTS ingestion_events (
                    id TEXT PRIMARY KEY,
                    source TEXT NOT NULL,
                    external_id TEXT,
                    status TEXT NOT NULL,
                    call_id TEXT,
                    payload TEXT,
                    error TEXT,
                    created_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_calls_agent ON calls(agent_id);
                CREATE INDEX IF NOT EXISTS idx_calls_started ON calls(started_at);
                CREATE INDEX IF NOT EXISTS idx_ingestion_created ON ingestion_events(created_at);
                """
            )

    def seed_from_json_if_empty(self) -> None:
        with self.connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
            if count > 0:
                return

            agents_path = self._settings.data_dir / self._settings.agents_file
            calls_path = self._settings.data_dir / self._settings.calls_file
            jobs_path = self._settings.data_dir / self._settings.jobs_file

            if agents_path.exists():
                for row in json.loads(agents_path.read_text(encoding="utf-8")):
                    agent = AgentRecord.model_validate(row)
                    self._insert_agent(conn, agent)

            if calls_path.exists():
                for row in json.loads(calls_path.read_text(encoding="utf-8")):
                    call = CallRecord.model_validate(row)
                    self._insert_call(conn, call, source="seed")

            if jobs_path.exists():
                for row in json.loads(jobs_path.read_text(encoding="utf-8")):
                    job = JobRecord.model_validate(row)
                    self._insert_job(conn, job)

    def stats(self) -> dict[str, Any]:
        with self.connection() as conn:
            calls = conn.execute("SELECT COUNT(*) FROM calls").fetchone()[0]
            agents = conn.execute("SELECT COUNT(*) FROM agents").fetchone()[0]
            jobs = conn.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
            ingestions = conn.execute("SELECT COUNT(*) FROM ingestion_events").fetchone()[0]
            last_ingest = conn.execute(
                "SELECT created_at FROM ingestion_events ORDER BY created_at DESC LIMIT 1"
            ).fetchone()
            return {
                "calls": calls,
                "agents": agents,
                "jobs": jobs,
                "ingestion_events": ingestions,
                "last_ingestion_at": last_ingest[0] if last_ingest else None,
                "db_path": str(self._path),
            }

    # --- Agents ---
    def list_agents(self) -> list[AgentRecord]:
        with self.connection() as conn:
            rows = conn.execute("SELECT * FROM agents ORDER BY name").fetchall()
            return [self._row_to_agent(r) for r in rows]

    def get_agent(self, agent_id: str) -> AgentRecord | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM agents WHERE id = ?", (agent_id,)).fetchone()
            return self._row_to_agent(row) if row else None

    def upsert_agent(self, agent: AgentRecord) -> None:
        with self.connection() as conn:
            self._insert_agent(conn, agent)

    # --- Calls ---
    def list_calls(self) -> list[CallRecord]:
        with self.connection() as conn:
            rows = conn.execute("SELECT * FROM calls ORDER BY started_at DESC").fetchall()
            return [self._row_to_call(r) for r in rows]

    def get_call(self, call_id: str) -> CallRecord | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM calls WHERE id = ?", (call_id,)).fetchone()
            return self._row_to_call(row) if row else None

    def insert_call(self, call: CallRecord, source: str = "api") -> CallRecord:
        with self.connection() as conn:
            self._insert_call(conn, call, source=source)
        return call

    # --- Jobs ---
    def list_jobs(self) -> list[JobRecord]:
        with self.connection() as conn:
            rows = conn.execute("SELECT * FROM jobs ORDER BY created_at DESC").fetchall()
            return [self._row_to_job(r) for r in rows]

    def get_job(self, job_id: str) -> JobRecord | None:
        with self.connection() as conn:
            row = conn.execute("SELECT * FROM jobs WHERE id = ?", (job_id,)).fetchone()
            return self._row_to_job(row) if row else None

    def create_job(self, request: JobCreateRequest) -> JobRecord:
        job = JobRecord(
            id=str(uuid4()),
            job_type=request.job_type,
            status=JobStatus.PENDING,
            created_at=datetime.utcnow(),
            payload=request.payload,
        )
        with self.connection() as conn:
            self._insert_job(conn, job)
        return job

    def update_job(self, job: JobRecord) -> JobRecord:
        with self.connection() as conn:
            conn.execute(
                """
                UPDATE jobs SET status=?, started_at=?, completed_at=?, progress=?,
                payload=?, result=?, error=? WHERE id=?
                """,
                (
                    job.status.value,
                    job.started_at.isoformat() if job.started_at else None,
                    job.completed_at.isoformat() if job.completed_at else None,
                    job.progress,
                    json.dumps(job.payload),
                    json.dumps(job.result) if job.result is not None else None,
                    job.error,
                    job.id,
                ),
            )
        return job

    # --- Ingestion ---
    def log_ingestion(
        self,
        source: str,
        status: str,
        payload: dict[str, Any],
        call_id: str | None = None,
        external_id: str | None = None,
        error: str | None = None,
    ) -> str:
        event_id = str(uuid4())
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO ingestion_events (id, source, external_id, status, call_id, payload, error, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    source,
                    external_id,
                    status,
                    call_id,
                    json.dumps(payload),
                    error,
                    datetime.utcnow().isoformat(),
                ),
            )
        return event_id

    def list_ingestion_events(self, limit: int = 50) -> list[dict[str, Any]]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT * FROM ingestion_events ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [dict(r) for r in rows]

    # --- helpers ---
    def _insert_agent(self, conn: sqlite3.Connection, agent: AgentRecord) -> None:
        conn.execute(
            """
            INSERT OR REPLACE INTO agents
            (id, name, team, email, active, hire_date, total_calls, avg_sentiment_score,
             booking_rate, avg_handle_time_seconds, specialties)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                agent.id,
                agent.name,
                agent.team,
                agent.email,
                int(agent.active),
                agent.hire_date.isoformat(),
                agent.total_calls,
                agent.avg_sentiment_score,
                agent.booking_rate,
                agent.avg_handle_time_seconds,
                json.dumps(agent.specialties),
            ),
        )

    def _insert_call(self, conn: sqlite3.Connection, call: CallRecord, source: str) -> None:
        conn.execute(
            """
            INSERT OR REPLACE INTO calls
            (id, agent_id, customer_name, phone_number, started_at, duration_seconds,
             outcome, sentiment, sentiment_score, booking_intent, transcript, keywords,
             summary, language, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                call.id,
                call.agent_id,
                call.customer_name,
                call.phone_number,
                call.started_at.isoformat(),
                call.duration_seconds,
                call.outcome.value,
                call.sentiment.value,
                call.sentiment_score,
                int(call.booking_intent),
                call.transcript,
                json.dumps([k.model_dump() for k in call.keywords]),
                call.summary,
                call.language,
                source,
            ),
        )

    def _insert_job(self, conn: sqlite3.Connection, job: JobRecord) -> None:
        conn.execute(
            """
            INSERT OR REPLACE INTO jobs
            (id, job_type, status, created_at, started_at, completed_at, progress, payload, result, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job.id,
                job.job_type.value,
                job.status.value,
                job.created_at.isoformat(),
                job.started_at.isoformat() if job.started_at else None,
                job.completed_at.isoformat() if job.completed_at else None,
                job.progress,
                json.dumps(job.payload),
                json.dumps(job.result) if job.result is not None else None,
                job.error,
            ),
        )

    @staticmethod
    def _row_to_agent(row: sqlite3.Row) -> AgentRecord:
        return AgentRecord(
            id=row["id"],
            name=row["name"],
            team=row["team"] or "",
            email=row["email"] or "",
            active=bool(row["active"]),
            hire_date=datetime.fromisoformat(row["hire_date"]),
            total_calls=row["total_calls"],
            avg_sentiment_score=row["avg_sentiment_score"],
            booking_rate=row["booking_rate"],
            avg_handle_time_seconds=row["avg_handle_time_seconds"],
            specialties=json.loads(row["specialties"] or "[]"),
        )

    @staticmethod
    def _row_to_call(row: sqlite3.Row) -> CallRecord:
        keywords_raw = json.loads(row["keywords"] or "[]")
        return CallRecord(
            id=row["id"],
            agent_id=row["agent_id"],
            customer_name=row["customer_name"],
            phone_number=row["phone_number"] or "",
            started_at=datetime.fromisoformat(row["started_at"]),
            duration_seconds=row["duration_seconds"],
            outcome=CallOutcome(row["outcome"]),
            sentiment=SentimentLabel(row["sentiment"]),
            sentiment_score=row["sentiment_score"],
            booking_intent=bool(row["booking_intent"]),
            transcript=row["transcript"],
            keywords=[KeywordHit.model_validate(k) for k in keywords_raw],
            summary=row["summary"] or "",
            language=row["language"] or "en",
        )

    @staticmethod
    def _row_to_job(row: sqlite3.Row) -> JobRecord:
        return JobRecord(
            id=row["id"],
            job_type=JobType(row["job_type"]),
            status=JobStatus(row["status"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
            completed_at=datetime.fromisoformat(row["completed_at"]) if row["completed_at"] else None,
            progress=row["progress"],
            payload=json.loads(row["payload"] or "{}"),
            result=json.loads(row["result"]) if row["result"] else None,
            error=row["error"],
        )


_db: Database | None = None


def get_database() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db
