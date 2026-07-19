"""Shared API-key authentication for admin / mutating endpoints."""

from fastapi import Header, HTTPException

from app.core.config import get_settings


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if x_api_key != get_settings().ingest_api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
