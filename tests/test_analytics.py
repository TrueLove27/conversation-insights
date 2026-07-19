def test_dashboard_metrics_shape(client):
    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    body = response.json()
    assert body["total_calls"] > 0
    assert 0 <= body["booking_rate"] <= 1
    assert "sentiment_distribution" in body
    assert "outcome_distribution" in body
    assert "calls_by_day" in body
    assert "top_keywords" in body
    assert "agent_leaderboard" in body
    for key in body["sentiment_distribution"]:
        assert key in {"positive", "neutral", "negative", "mixed"}


def test_dashboard_date_filter_future_empty(client):
    response = client.get("/api/v1/analytics/dashboard?from_date=2099-01-01T00:00:00")
    assert response.status_code == 200
    body = response.json()
    assert body["total_calls"] == 0
    assert body["booking_rate"] == 0
    assert body["agent_leaderboard"] == []


def test_dashboard_uses_sql_aggregates(client, monkeypatch):
    """Ensure dashboard path uses SQL aggregates, not filtered full-row hydration."""
    from app.repositories.call_repository import CallRepository

    def _boom(self, filters):
        raise AssertionError("find_filtered should not be used for dashboard metrics")

    monkeypatch.setattr(CallRepository, "find_filtered", _boom)
    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    assert response.json()["total_calls"] > 0


def test_agent_metrics_does_not_load_transcripts(client, monkeypatch):
    """Agent metrics must use slim summaries, not SELECT * call hydration."""
    from app.repositories.call_repository import CallRepository

    def _boom(self, filters):
        raise AssertionError("find_filtered should not be used for agent metrics")

    monkeypatch.setattr(CallRepository, "find_filtered", _boom)
    agents = client.get("/api/v1/agents").json()
    assert agents
    agent_id = agents[0]["id"]
    response = client.get(f"/api/v1/analytics/agents/{agent_id}")
    assert response.status_code == 200
    body = response.json()
    assert "recent_calls" in body
    for call in body["recent_calls"]:
        assert "transcript" not in call
        assert "keywords" not in call
        assert "summary" not in call
        assert "customer_name" in call
        assert "sentiment" in call
