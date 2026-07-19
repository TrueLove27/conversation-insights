import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DIR = Path(__file__).resolve().parent / "_data"
TEST_DIR.mkdir(exist_ok=True)
TEST_DB = TEST_DIR / "pytest.db"

os.environ["DATABASE_PATH"] = str(TEST_DB)
os.environ["INGEST_API_KEY"] = "test-ingest-key"
os.environ["ENABLE_LLM_ANALYSIS"] = "false"
os.environ["WEBHOOK_SECRET"] = ""

from app.core.config import get_settings

get_settings.cache_clear()


@pytest.fixture()
def client() -> TestClient:
    if TEST_DB.exists():
        TEST_DB.unlink()

    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
