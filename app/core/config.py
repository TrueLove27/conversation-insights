from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Conversation Insights API"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    debug: bool = False
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    data_dir: Path = Path(__file__).resolve().parent.parent.parent / "data"
    calls_file: str = "calls.json"
    agents_file: str = "agents.json"
    jobs_file: str = "jobs.json"

    job_poll_interval_seconds: float = 2.0
    job_simulation_steps: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
