def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == "2.0.0"
    assert "database" in body
    assert body["database"]["calls"] >= 0


def test_health_includes_rag_integration(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert "integrations" in body
    assert "rag" in body["integrations"]
    assert "reachable" in body["integrations"]["rag"]
    assert "detail" in body["integrations"]["rag"]
    assert "X-Request-ID" in response.headers


def test_list_calls(client):
    response = client.get("/api/v1/calls?limit=5")
    assert response.status_code == 200
    body = response.json()
    assert "items" in body
    assert "total" in body
    assert body["total"] > 0


def test_list_calls_filter_by_sentiment(client):
    response = client.get("/api/v1/calls?sentiment=positive&limit=50")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    assert all(item["sentiment"] == "positive" for item in body["items"])


def test_list_calls_filter_by_agent_id(client):
    response = client.get("/api/v1/calls?agent_id=agent-001&limit=50")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] > 0
    assert all(item["agent_id"] == "agent-001" for item in body["items"])


def test_list_calls_pagination(client):
    first = client.get("/api/v1/calls?limit=2&offset=0")
    second = client.get("/api/v1/calls?limit=2&offset=2")
    assert first.status_code == 200
    assert second.status_code == 200
    page1 = first.json()
    page2 = second.json()
    assert len(page1["items"]) == 2
    assert len(page2["items"]) == 2
    assert page1["total"] == page2["total"]
    assert page1["total"] > 4
    ids1 = {item["id"] for item in page1["items"]}
    ids2 = {item["id"] for item in page2["items"]}
    assert ids1.isdisjoint(ids2)


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


async def _raise_rag_down(*_args, **_kwargs):
    raise ConnectionError("rag-service unreachable")


def test_analyze_rag_degraded_when_rag_down(client, monkeypatch):
    from app.clients.rag_client import RagClient

    monkeypatch.setattr(RagClient, "context_for_analysis", _raise_rag_down)
    monkeypatch.setattr(RagClient, "scan_compliance", _raise_rag_down)
    monkeypatch.setattr(RagClient, "suggest_script", _raise_rag_down)

    response = client.post(
        "/api/v1/analyze",
        json={
            "transcript": "Agent: Thanks for calling today. Customer: I want to book a demo for Tuesday afternoon.",
            "agent_id": "agent-001",
            "customer_name": "Test User",
            "use_rag_context": True,
            "industry": "healthcare",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "sentiment" in body
    assert body["rag_degraded"] is True
    assert len(body["rag_warnings"]) >= 1


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
    assert body["rag_sync_scheduled"] is True


def test_admin_knowledge_requires_api_key(client):
    assert client.post("/api/v1/knowledge/sync-rag").status_code == 401
    assert client.post("/api/v1/knowledge/import-corpus?limit=10").status_code == 401
    assert client.get("/api/v1/ingest/events").status_code == 401


def test_sync_rag_with_api_key(client, monkeypatch):
    from app.clients.rag_client import RagClient

    async def _fake_sync(_self):
        return {"success": True, "message": "synced"}

    monkeypatch.setattr(RagClient, "sync_all", _fake_sync)
    response = client.post(
        "/api/v1/knowledge/sync-rag",
        headers={"X-API-Key": "test-ingest-key"},
    )
    assert response.status_code == 200
    assert response.json()["success"] is True


def test_import_corpus_with_api_key(client, monkeypatch):
    async def _fake_import(*_args, **_kwargs):
        return {"imported": 3, "skipped": 0, "available": 10}

    monkeypatch.setattr(
        "app.api.routes.knowledge._corpus.import_calls",
        _fake_import,
    )
    monkeypatch.setattr(
        "app.api.routes.knowledge.schedule_rag_sync",
        lambda reason: True,
    )
    response = client.post(
        "/api/v1/knowledge/import-corpus?limit=10",
        headers={"X-API-Key": "test-ingest-key"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["imported"] == 3
    assert body["rag_sync_scheduled"] is True


def test_ingest_events_with_api_key(client):
    response = client.get(
        "/api/v1/ingest/events",
        headers={"X-API-Key": "test-ingest-key"},
    )
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_knowledge_ask_validation(client):
    response = client.post("/api/v1/knowledge/ask", json={"question": "hi"})
    assert response.status_code == 422


def test_analyze_shares_rag_path(client, monkeypatch):
    from app.clients.rag_client import RagClient

    monkeypatch.setattr(RagClient, "context_for_analysis", _raise_rag_down)
    monkeypatch.setattr(RagClient, "scan_compliance", _raise_rag_down)
    monkeypatch.setattr(RagClient, "suggest_script", _raise_rag_down)

    response = client.post(
        "/api/v1/analyze",
        json={
            "transcript": "Agent: Thanks for calling today. Customer: I want to book a demo for Tuesday afternoon.",
            "agent_id": "agent-001",
            "use_rag_context": True,
            "industry": "healthcare",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["rag_degraded"] is True
    assert "sentiment" in body


def test_integration_status(client):
    response = client.get("/api/v1/integrations/status")
    assert response.status_code == 200
    body = response.json()
    assert "groq" in body
    assert "database" in body
    assert body["ingest_api_key_configured"] is True
