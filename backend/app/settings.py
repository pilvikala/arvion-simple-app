"""Application configuration helpers."""
from functools import lru_cache
import os
from typing import Iterable
from pydantic import BaseModel, field_validator


def _parse_origins(raw: str | Iterable[str]) -> list[str]:
    if isinstance(raw, str):
        candidates = raw.split(",")
    else:
        candidates = list(raw)
    cleaned = []
    for candidate in candidates:
        value = candidate.strip()
        if not value:
            continue
        cleaned.append(value.rstrip("/"))
    return cleaned


class Settings(BaseModel):
    app_name: str = "Simple Web App"
    database_url: str
    frontend_origins: list[str]

    @field_validator("database_url")
    @classmethod
    def validate_db_url(cls, value: str) -> str:
        if not value.startswith("postgresql"):
            raise ValueError("DATABASE_URL must point to a Postgres database")
        return value

    @field_validator("frontend_origins", mode="before")
    @classmethod
    def validate_origins(cls, value):
        if isinstance(value, list):
            return _parse_origins(value)
        return _parse_origins(str(value))


@lru_cache
def get_settings() -> Settings:
    frontend_origin_env = (
        os.getenv("FRONTEND_ORIGINS")
        or os.getenv("FRONTEND_ORIGIN")
        or "http://localhost:5173,http://127.0.0.1:5173,http://0.0.0.0:5173"
    )
    return Settings(
        database_url=os.getenv(
            "DATABASE_URL",
            "postgresql+psycopg2://postgres:postgres@db:5432/simple_web_app",
        ),
        frontend_origins=frontend_origin_env,
    )
