"""Helper utilities for executing ad-hoc SQL queries."""
from __future__ import annotations

from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

from .schemas import SQLQueryResult, serialize_value


def execute_sql_query(connection_string: str, query: str) -> SQLQueryResult:
    """Runs the user-provided SQL and returns column metadata and rows."""
    sanitized_query = query.strip()
    if not sanitized_query:
        raise ValueError("Query cannot be empty")

    try:
        with psycopg2.connect(connection_string) as connection:
            connection.autocommit = False
            with connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sanitized_query)
                row_count = cursor.rowcount if cursor.rowcount != -1 else 0

                if cursor.description:
                    columns = [desc.name for desc in cursor.description]
                    raw_rows = cursor.fetchall()
                    rows = [_serialize_row(row) for row in raw_rows]
                else:
                    columns = []
                    rows = []

                connection.commit()

    except psycopg2.Error as exc:  # pragma: no cover - network/database errors
        raise RuntimeError(exc.pgerror or str(exc)) from exc

    message = None if columns else f"Statement executed successfully ({row_count} rows affected)."
    return SQLQueryResult(columns=columns, rows=rows, row_count=row_count, message=message)


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    serialized = {}
    for key, value in row.items():
        serialized[key] = serialize_value(value)
    return serialized


def test_connection_string(connection_string: str) -> None:
    """Performs a lightweight connectivity check against the provided DSN."""
    try:
        with psycopg2.connect(connection_string) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                cursor.fetchone()
    except psycopg2.Error as exc:  # pragma: no cover - network/database errors
        raise RuntimeError(exc.pgerror or str(exc)) from exc

