from collections import Counter
from datetime import datetime

from app.models.schemas import AgentMetrics, AgentRecord, CallRecord, DashboardMetrics, KeywordHit
from app.repositories.agent_repository import AgentRepository
from app.repositories.call_repository import CallRepository
from app.services.call_service import CallService


class AnalyticsService:
    def __init__(
        self,
        call_repository: CallRepository | None = None,
        agent_repository: AgentRepository | None = None,
        call_service: CallService | None = None,
    ):
        self._calls = call_repository or CallRepository()
        self._agents = agent_repository or AgentRepository()
        self._call_service = call_service or CallService(self._calls, self._agents)

    def get_dashboard_metrics(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ) -> DashboardMetrics:
        raw = self._calls.dashboard_metrics(from_date=from_date, to_date=to_date)
        return DashboardMetrics(
            total_calls=raw["total_calls"],
            booking_rate=raw["booking_rate"],
            avg_sentiment_score=raw["avg_sentiment_score"],
            avg_duration_seconds=raw["avg_duration_seconds"],
            sentiment_distribution=raw["sentiment_distribution"],
            outcome_distribution=raw["outcome_distribution"],
            calls_by_day=raw["calls_by_day"],
            top_keywords=[KeywordHit.model_validate(item) for item in raw["top_keywords"]],
            agent_leaderboard=raw["agent_leaderboard"],
        )

    def get_agent_metrics(self, agent_id: str) -> AgentMetrics | None:
        agent = self._agents.find_by_id(agent_id)
        if not agent:
            return None

        recent_calls = self._call_service.get_calls_for_agent(agent_id, limit=10)
        sentiment_trend = self._build_sentiment_trend(recent_calls)
        outcome_breakdown = Counter(call.outcome.value for call in recent_calls)

        return AgentMetrics(
            agent=agent,
            recent_calls=recent_calls,
            sentiment_trend=sentiment_trend,
            outcome_breakdown=dict(outcome_breakdown),
        )

    def list_agents(self) -> list[AgentRecord]:
        return self._agents.find_all()

    def get_agent(self, agent_id: str) -> AgentRecord | None:
        return self._agents.find_by_id(agent_id)

    def _build_sentiment_trend(self, calls: list[CallRecord]) -> list[dict]:
        ordered = sorted(calls, key=lambda call: call.started_at)
        return [
            {
                "timestamp": call.started_at.isoformat(),
                "sentiment_score": call.sentiment_score,
                "label": call.sentiment.value,
            }
            for call in ordered
        ]
