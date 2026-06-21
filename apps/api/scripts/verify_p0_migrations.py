#!/usr/bin/env python3
"""Verify Phase H P0 migration artifacts exist in the connected database."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import asyncpg

API_ROOT = Path(__file__).resolve().parents[1]


def _load_database_url() -> str:
    env_path = API_ROOT / ".env"
    if env_path.is_file():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("DATABASE_URL="):
                return line.split("=", 1)[1].strip()
    url = __import__("os").environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL not found in .env or environment")
    return url


def _normalize_pg_url(database_url: str) -> str:
    return database_url.replace("postgresql+asyncpg://", "postgresql://")


P0_COLUMN_CHECKS: list[tuple[str, str, str, tuple[str, ...]]] = [
    ("operations", "enquiries", "order_outcome", ("order_outcome", "order_outcome_remarks")),
    ("identity", "users", "archived_at", ("archived_at", "archived_by")),
    ("identity", "users", "user_badge_id", ("user_badge_id",)),
    ("clinical", "doctors", "languages_known", ("languages_known",)),
    ("clinical", "patients", "preferred_language", ("preferred_language",)),
]

P0_TABLES: tuple[str, ...] = (
    "audit.inbox_notifications",
    "audit.notification_outbox",
    "integrations.notifications_log",
)

P0_INDEXES: tuple[str, ...] = (
    "clinical.idx_doctors_languages_known",
)


async def _column_names(conn: asyncpg.Connection, schema: str, table: str) -> set[str]:
    rows = await conn.fetch(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2
        """,
        schema,
        table,
    )
    return {row["column_name"] for row in rows}


async def verify() -> int:
    database_url = _normalize_pg_url(_load_database_url())
    conn = await asyncpg.connect(database_url)
    failures: list[str] = []

    try:
        for schema, table, label, expected in P0_COLUMN_CHECKS:
            present = await _column_names(conn, schema, table)
            missing = [name for name in expected if name not in present]
            if missing:
                failures.append(f"Missing columns on {schema}.{table} ({label}): {', '.join(missing)}")

        for qualified in P0_TABLES:
            exists = await conn.fetchval("SELECT to_regclass($1)", qualified)
            if exists is None:
                failures.append(f"Missing table: {qualified}")

        for qualified in P0_INDEXES:
            exists = await conn.fetchval("SELECT to_regclass($1)", qualified)
            if exists is None:
                failures.append(f"Missing index: {qualified}")
    finally:
        await conn.close()

    if failures:
        print("P0 migration verification FAILED:\n")
        for item in failures:
            print(f"  - {item}")
        print("\nApply pending migrations: npm run migrate (or uv run python scripts/apply_pending_migrations.py).")
        print("Required includes 034, 036, 038, and 039 (see LOCAL_CREDENTIALS.md).")
        return 1

    print("P0 migration verification passed.")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(verify()))


if __name__ == "__main__":
    main()
