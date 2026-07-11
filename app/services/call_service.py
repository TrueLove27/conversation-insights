from datetime import datetime

from app.models.schemas import CallFilterParams, CallRecord, PaginatedCalls
from app.repositories.agent_repository import AgentRepository
from app.repositories.call_repository import CallRepository


class CallService:
    def __init__(
        self,
        call_repository: CallRepository | None = None,
        agent_repository: AgentRepository | None = None,
    ):
        self._calls = call_repository or CallRepository()
        self._agents = agent_repository or AgentRepository()

    def list_calls(self, filters: CallFilterParams) -> PaginatedCalls:
        items = self._calls.find_all()
        items = self._apply_filters(items, filters)
        total = len(items)
        page = items[filters.offset : filters.offset + filters.limit]
        return PaginatedCalls(items=page, total=total, limit=filters.limit, offset=filters.offset)

    def get_call(self, call_id: str) -> CallRecord | None:
        return self._calls.find_by_id(call_id)

    def get_calls_for_agent(self, agent_id: str, limit: int = 20) -> list[CallRecord]:
        calls = [call for call in self._calls.find_all() if call.agent_id == agent_id]
        calls.sort(key=lambda call: call.started_at, reverse=True)
        return calls[:limit]

    def _apply_filters(self, items: list[CallRecord], filters: CallFilterParams) -> list[CallRecord]:
        filtered = items

        if filters.agent_id:
            filtered = [call for call in filtered if call.agent_id == filters.agent_id]

        if filters.outcome:
            filtered = [call for call in filtered if call.outcome == filters.outcome]

        if filters.sentiment:
            filtered = [call for call in filtered if call.sentiment == filters.sentiment]

        if filters.from_date:
            filtered = [call for call in filtered if call.started_at >= filters.from_date]

        if filters.to_date:
            filtered = [call for call in filtered if call.started_at <= filters.to_date]

        if filters.search:
            query = filters.search.lower()
            filtered = [
                call
                for call in filtered
                if query in call.transcript.lower()
                or query in call.customer_name.lower()
                or query in call.summary.lower()
            ]

        filtered.sort(key=lambda call: call.started_at, reverse=True)
        return filtered
