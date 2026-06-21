#!/usr/bin/env python3
"""Mark all migration files as applied in audit.schema_migrations without running SQL.

Use once when the database was migrated before the ledger existed (ledger row count = 0
but application tables already present). Does not modify application data.
"""

from __future__ import annotations

import asyncio
import hashlib
import sys
from pathlib import Path

import asyncpg

API_ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = API_ROOT.parent
MIGRATIONS_DIR = REPO_ROOT / "database" / "migrations"


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


def _checksum(sql: str) -> str:
    return hashlib.sha256(sql.encode("utf-8")).hexdigest()


def _migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


# Migrations that must have a marker column present before ledger bootstrap records them.
_SCHEMA_MARKERS: dict[str, tuple[str, str, str]] = {
    "039_doctor_languages.sql": ("clinical", "doctors", "languages_known"),
}


async def _column_exists(conn: asyncpg.Connection, schema: str, table: str, column: str) -> bool:
    row = await conn.fetchval(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = $1 AND table_name = $2 AND column_name = $3
        LIMIT 1
        """,
        schema,
        table,
        column,
    )
    return row is not None


async def bootstrap() -> int:
    database_url = _normalize_pg_url(_load_database_url())
    files = _migration_files()
    if not files:
        raise SystemExit(f"No migration files found in {MIGRATIONS_DIR}")

    conn = await asyncpg.connect(database_url)
    try:
        await conn.execute("CREATE SCHEMA IF NOT EXISTS audit")
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS audit.schema_migrations (
              filename text PRIMARY KEY,
              checksum text NOT NULL,
              applied_at timestamptz NOT NULL DEFAULT now()
            )
            """
        )

        existing_count = await conn.fetchval("SELECT count(*) FROM audit.schema_migrations")
        if existing_count:
            print(f"Ledger already has {existing_count} entries — bootstrap skipped.")
            return 0

        doctors_exists = await conn.fetchval("SELECT to_regclass('clinical.doctors')")
        if doctors_exists is None:
            raise SystemExit(
                "Refusing to bootstrap: clinical.doctors not found. "
                "Run apply_pending_migrations.py on a fresh database instead."
            )

        inserted = 0
        for path in files:
            marker = _SCHEMA_MARKERS.get(path.name)
            if marker:
                schema, table, column = marker
                if not await _column_exists(conn, schema, table, column):
                    print(f"skip ledger {path.name} (not applied yet — run apply_pending_migrations.py)")
                    continue

            sql = path.read_text(encoding="utf-8")
            digest = _checksum(sql)
            await conn.execute(
                "INSERT INTO audit.schema_migrations(filename, checksum) VALUES ($1, $2)",
                path.name,
                digest,
            )
            print(f"ledger {path.name}")
            inserted += 1

        print(f"Bootstrap complete ({inserted} entries recorded, no SQL executed).")
    finally:
        await conn.close()

    return 0


def main() -> None:
    raise SystemExit(asyncio.run(bootstrap()))


if __name__ == "__main__":
    main()
