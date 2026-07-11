from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Conversation Insights API"
    app_version: str = "2.0.0"
    api_prefix: str = "/api/v1"
    debug: bool = False
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
    ]

    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    db_path: Path = Field(
        default=Path(__file__).resolve().parent.parent.parent / "data" / "conversation_insights.db",
        validation_alias="DATABASE_PATH",
    )
    calls_file: str = "calls.json"
    agents_file: str = "agents.json"
    jobs_file: str = "jobs.json"

    job_poll_interval_seconds: float = 2.0
    job_simulation_steps: int = 5

    # Rate limits (requests per minute)
    rate_limit_default: str = "120/minute"
    rate_limit_analyze: str = "20/minute"
    rate_limit_ingest: str = "40/minute"

    # Ingestion / integrations
    ingest_api_key: str = "dev-ingest-key-change-me"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    webhook_secret: str | None = None
    enable_llm_analysis: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
