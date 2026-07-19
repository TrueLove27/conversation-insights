import logging

from app.models.schemas import CallFilterParams, CallRecord, PaginatedCalls
from app.repositories.agent_repository import AgentRepository
from app.repositories.call_repository import CallRepository

logger = logging.getLogger(__name__)


class CallService:
    def __init__(
        self,
        call_repository: CallRepository | None = None,
        agent_repository: AgentRepository | None = None,
    ):
        self._calls = call_repository or CallRepository()
        self._agents = agent_repository or AgentRepository()

    def list_calls(self, filters: CallFilterParams) -> PaginatedCalls:
        items, total = self._calls.find_filtered(filters)
        logger.debug(
            "list_calls total=%s limit=%s offset=%s",
            total,
            filters.limit,
            filters.offset,
        )
        return PaginatedCalls(items=items, total=total, limit=filters.limit, offset=filters.offset)

    def get_call(self, call_id: str) -> CallRecord | None:
        return self._calls.find_by_id(call_id)

    def get_calls_for_agent(self, agent_id: str, limit: int = 20) -> list[CallRecord]:
        filters = CallFilterParams(agent_id=agent_id, limit=limit, offset=0)
        items, _ = self._calls.find_filtered(filters)
        return items
