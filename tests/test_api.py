def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "2.0.0"
    assert "database" in body
    assert body["database"]["calls"] >= 0


def test_list_calls(client):
    response = client.get("/api/v1/calls?limit=5")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] > 0


def test_dashboard_metrics(client):
    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert "total_calls" in body
    assert body["total_calls"] > 0


def test_analyze_transcript(client):
    response = client.post(
        "/api/v1/analyze",
        json={
            "transcript": "Agent: Thanks for calling today. Customer: I want to book a demo for Tuesday afternoon.",
            "agent_id": "agent-001",
            "customer_name": "Test User",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "sentiment" in body
    assert "booking_intent" in body


def test_ingest_call_requires_api_key(client):
    response = client.post(
        "/api/v1/ingest/call",
        json={
            "transcript": "Agent: Good morning. Customer: Please schedule my onboarding call for next week.",
            "agent_id": "agent-001",
            "customer_name": "Ingest Test",
        },
    )
    assert response.status_code == 401


def test_ingest_call_with_api_key(client):
    response = client.post(
        "/api/v1/ingest/call",
        headers={"X-API-Key": "test-ingest-key"},
        json={
            "transcript": "Agent: Good morning. Customer: Please schedule my onboarding call for next week.",
            "agent_id": "agent-001",
            "customer_name": "Ingest Test",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["call_id"] is not None


def test_integration_status(client):
    response = client.get("/api/v1/integrations/status")
    assert response.status_code == 200
    body = response.json()
    assert "groq" in body
    assert "database" in body
    assert body["ingest_api_key_configured"] is True
