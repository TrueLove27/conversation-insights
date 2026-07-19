import time

import pytest


def test_create_job_requires_api_key(client):
    response = client.post(
        "/api/v1/jobs",
        json={"job_type": "batch_analysis", "payload": {"call_ids": ["call-1001"]}},
    )
    assert response.status_code == 401


def test_webhook_requires_configured_secret(client):
    response = client.post(
        "/api/v1/ingest/webhook",
        json={
            "transcript": "Agent: Hello there. Customer: Please book a demo for next Tuesday afternoon.",
            "agent_id": "agent-001",
            "customer_name": "Webhook User",
        },
    )
    assert response.status_code == 401
    assert "not configured" in response.json()["detail"].lower()


def _wait_for_job(client, job_id: str, timeout_s: float = 5.0) -> dict:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        response = client.get(f"/api/v1/jobs/{job_id}")
        assert response.status_code == 200
        body = response.json()
        if body["status"] in {"completed", "failed"}:
            return body
        time.sleep(0.05)
    pytest.fail(f"Job {job_id} did not finish within {timeout_s}s")


def test_batch_analysis_job_uses_real_call_data(client):
    create = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": "test-ingest-key"},
        json={
            "job_type": "batch_analysis",
            "payload": {"call_ids": ["call-1001", "call-1002", "missing-id"]},
        },
    )
    assert create.status_code == 201
    job_id = create.json()["id"]

    body = _wait_for_job(client, job_id)
    assert body["status"] == "completed"
    result = body["result"]
    assert result is not None
    assert result["processed"] >= 1
    assert result["failed"] >= 1
    assert "results" in result
    assert "avg_sentiment" in result
    assert "flagged_calls" not in result
    first = result["results"][0]
    assert "call_id" in first
    assert "sentiment" in first
    assert "booking_intent" in first


def test_keyword_extraction_job_from_calls(client):
    create = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": "test-ingest-key"},
        json={
            "job_type": "keyword_extraction",
            "payload": {"call_ids": ["call-1001", "call-1002"]},
        },
    )
    assert create.status_code == 201
    body = _wait_for_job(client, create.json()["id"])
    assert body["status"] == "completed"
    result = body["result"]
    assert result["scanned_calls"] >= 1
    assert isinstance(result["keywords"], list)


def test_agent_report_job_returns_metrics(client):
    create = client.post(
        "/api/v1/jobs",
        headers={"X-API-Key": "test-ingest-key"},
        json={"job_type": "agent_report", "payload": {"agent_id": "agent-001"}},
    )
    assert create.status_code == 201
    body = _wait_for_job(client, create.json()["id"])
    assert body["status"] == "completed"
    result = body["result"]
    assert result["agent_id"] == "agent-001"
    assert "name" in result
    assert "recent_call_ids" in result
    assert "report_url" not in result
