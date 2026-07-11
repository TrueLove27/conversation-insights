from collections import Counter, defaultdict
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

    def get_dashboard_metrics(self) -> DashboardMetrics:
        calls = self._calls.find_all()
        agents = {agent.id: agent for agent in self._agents.find_all()}

        total_calls = len(calls)
        booked = sum(1 for call in calls if call.outcome.value == "booked")
        booking_rate = round(booked / total_calls, 4) if total_calls else 0.0
        avg_sentiment = round(sum(call.sentiment_score for call in calls) / total_calls, 4) if total_calls else 0.0
        avg_duration = round(sum(call.duration_seconds for call in calls) / total_calls, 2) if total_calls else 0.0

        sentiment_distribution = Counter(call.sentiment.value for call in calls)
        outcome_distribution = Counter(call.outcome.value for call in calls)

        calls_by_day = self._aggregate_calls_by_day(calls)
        top_keywords = self._aggregate_keywords(calls, limit=10)
        agent_leaderboard = self._build_agent_leaderboard(calls, agents)

        return DashboardMetrics(
            total_calls=total_calls,
            booking_rate=booking_rate,
            avg_sentiment_score=avg_sentiment,
            avg_duration_seconds=avg_duration,
            sentiment_distribution=dict(sentiment_distribution),
            outcome_distribution=dict(outcome_distribution),
            calls_by_day=calls_by_day,
            top_keywords=top_keywords,
            agent_leaderboard=agent_leaderboard,
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

    def _aggregate_calls_by_day(self, calls: list[CallRecord]) -> list[dict]:
        buckets: dict[str, dict] = defaultdict(lambda: {"date": "", "calls": 0, "bookings": 0})
        for call in calls:
            day = call.started_at.strftime("%Y-%m-%d")
            bucket = buckets[day]
            bucket["date"] = day
            bucket["calls"] += 1
            if call.outcome.value == "booked":
                bucket["bookings"] += 1
        return sorted(buckets.values(), key=lambda row: row["date"])

    def _aggregate_keywords(self, calls: list[CallRecord], limit: int) -> list[KeywordHit]:
        counter: Counter[str] = Counter()
        categories: dict[str, str] = {}
        for call in calls:
            for keyword in call.keywords:
                counter[keyword.term] += keyword.count
                categories[keyword.term] = keyword.category
        top = counter.most_common(limit)
        return [KeywordHit(term=term, count=count, category=categories[term]) for term, count in top]

    def _build_agent_leaderboard(
        self, calls: list[CallRecord], agents: dict[str, AgentRecord]
    ) -> list[dict]:
        stats: dict[str, dict] = defaultdict(
            lambda: {"agent_id": "", "name": "Unknown", "calls": 0, "bookings": 0, "avg_sentiment": 0.0}
        )
        sentiment_totals: dict[str, float] = defaultdict(float)

        for call in calls:
            row = stats[call.agent_id]
            agent = agents.get(call.agent_id)
            row["agent_id"] = call.agent_id
            row["name"] = agent.name if agent else call.agent_id
            row["calls"] += 1
            sentiment_totals[call.agent_id] += call.sentiment_score
            if call.outcome.value == "booked":
                row["bookings"] += 1

        leaderboard = []
        for agent_id, row in stats.items():
            calls_count = row["calls"]
            row["avg_sentiment"] = round(sentiment_totals[agent_id] / calls_count, 4) if calls_count else 0.0
            row["booking_rate"] = round(row["bookings"] / calls_count, 4) if calls_count else 0.0
            leaderboard.append(row)

        return sorted(leaderboard, key=lambda row: (row["booking_rate"], row["avg_sentiment"]), reverse=True)

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
