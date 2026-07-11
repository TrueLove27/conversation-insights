from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.database import JsonStore
from app.models.schemas import AgentRecord, CallRecord, JobRecord


class CallRepository:
    def __init__(self, settings: Settings | None = None):
        self._settings = settings or get_settings()
        self._store = JsonStore[dict](self._settings.data_dir / self._settings.calls_file, default=[])

    def find_all(self) -> list[CallRecord]:
        return [CallRecord.model_validate(item) for item in self._store.read_all()]

    def find_by_id(self, call_id: str) -> CallRecord | None:
        for item in self.find_all():
            if item.id == call_id:
                return item
        return None

    def save_all(self, calls: list[CallRecord]) -> None:
        payload = [call.model_dump(mode="json") for call in calls]
        self._store.write_all(payload)

    def count(self) -> int:
        return len(self._store.read_all())

    def file_exists(self) -> bool:
        path: Path = self._settings.data_dir / self._settings.calls_file
        return path.exists()
