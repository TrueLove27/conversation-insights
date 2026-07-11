from app.core.config import Settings, get_settings
from app.core.database import JsonStore
from app.models.schemas import AgentRecord


class AgentRepository:
    def __init__(self, settings: Settings | None = None):
        self._settings = settings or get_settings()
        self._store = JsonStore[dict](self._settings.data_dir / self._settings.agents_file, default=[])

    def find_all(self) -> list[AgentRecord]:
        return [AgentRecord.model_validate(item) for item in self._store.read_all()]

    def find_by_id(self, agent_id: str) -> AgentRecord | None:
        for item in self.find_all():
            if item.id == agent_id:
                return item
        return None

    def save_all(self, agents: list[AgentRecord]) -> None:
        payload = [agent.model_dump(mode="json") for agent in agents]
        self._store.write_all(payload)

    def file_exists(self) -> bool:
        return (self._settings.data_dir / self._settings.agents_file).exists()
