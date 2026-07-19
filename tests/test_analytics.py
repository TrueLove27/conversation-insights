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


def test_dashboard_does_not_require_find_all(client, monkeypatch):
    """Ensure dashboard path uses SQL aggregates, not full call hydration."""
    from app.repositories.call_repository import CallRepository

    def _boom(self):
        raise AssertionError("find_all should not be used for dashboard metrics")

    monkeypatch.setattr(CallRepository, "find_all", _boom)
    response = client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    assert response.json()["total_calls"] > 0
