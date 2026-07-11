import json
import threading
from pathlib import Path
from typing import Any, Generic, TypeVar

T = TypeVar("T")


class JsonStore(Generic[T]):
    """Thread-safe JSON file persistence layer."""

    def __init__(self, file_path: Path, default: list[T] | dict[str, Any] | None = None):
        self.file_path = file_path
        self._lock = threading.RLock()
        self._default: list[T] | dict[str, Any] = default if default is not None else []
        self._ensure_file()

    def _ensure_file(self) -> None:
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.file_path.exists():
            self._write_raw(self._default)

    def _read_raw(self) -> list[T] | dict[str, Any]:
        with self._lock:
            with self.file_path.open("r", encoding="utf-8") as handle:
                return json.load(handle)

    def _write_raw(self, data: list[T] | dict[str, Any]) -> None:
        with self._lock:
            with self.file_path.open("w", encoding="utf-8") as handle:
                json.dump(data, handle, indent=2, ensure_ascii=False)
                handle.write("\n")

    def read_all(self) -> list[T]:
        data = self._read_raw()
        if not isinstance(data, list):
            raise ValueError(f"Expected list in {self.file_path}")
        return data

    def write_all(self, items: list[T]) -> None:
        self._write_raw(items)

    def read_dict(self) -> dict[str, Any]:
        data = self._read_raw()
        if not isinstance(data, dict):
            raise ValueError(f"Expected dict in {self.file_path}")
        return data

    def write_dict(self, payload: dict[str, Any]) -> None:
        self._write_raw(payload)

    def reload(self) -> list[T]:
        return self.read_all()
