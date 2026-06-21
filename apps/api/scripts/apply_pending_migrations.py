#!/usr/bin/env python3
"""Apply pending SQL migrations idempotently using audit.schema_migrations ledger."""

from __future__ import annotations

import asyncio
import hashlib
import re
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


def _migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def _checksum(sql: str) -> str:
    return hashlib.sha256(sql.encode("utf-8")).hexdigest()


def _split_sql_statements(sql: str) -> list[str]:
    parts: list[str] = []
    buf: list[str] = []
    in_dollar = False
    dollar_tag = ""

    for line in sql.splitlines():
        if not in_dollar:
            match = re.search(r"\$(\w*)\$", line)
            if match:
                tag = match.group(1)
                occurrences = len(re.findall(rf"\${tag}\$", line))
                if occurrences == 1:
                    in_dollar = True
                    dollar_tag = tag
        else:
            if re.search(rf"\${dollar_tag}\$", line):
                in_dollar = False
                dollar_tag = ""

        buf.append(line)
        if not in_dollar and line.rstrip().endswith(";"):
            parts.append("\n".join(buf))
            buf = []

    if buf:
        trailing = "\n".join(buf).strip()
        if trailing:
            parts.append(trailing)
    return parts


async def _ensure_migration_ledger(conn: asyncpg.Connection) -> None:
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


async def _apply_migration_file(conn: asyncpg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    for statement in _split_sql_statements(sql):
        stmt = statement.strip()
        if stmt:
            await conn.execute(stmt)


async def apply_pending() -> int:
    database_url = _normalize_pg_url(_load_database_url())
    files = _migration_files()
    if not files:
        raise SystemExit(f"No migration files found in {MIGRATIONS_DIR}")

    conn = await asyncpg.connect(database_url)
    applied = 0
    skipped = 0

    try:
        await _ensure_migration_ledger(conn)

        for path in files:
            sql = path.read_text(encoding="utf-8")
            digest = _checksum(sql)
            existing = await conn.fetchrow(
                "SELECT checksum FROM audit.schema_migrations WHERE filename = $1",
                path.name,
            )

            if existing:
                if existing["checksum"] != digest:
                    raise SystemExit(
                        f"Migration {path.name} was already applied with a different checksum."
                    )
                print(f"skip {path.name}")
                skipped += 1
                continue

            print(f"apply {path.name}")
            await _apply_migration_file(conn, path)
            await conn.execute(
                "INSERT INTO audit.schema_migrations(filename, checksum) VALUES ($1, $2)",
                path.name,
                digest,
            )
            applied += 1
    finally:
        await conn.close()

    print(f"migrations complete ({applied} applied, {skipped} skipped)")
    return 0


def main() -> None:
    raise SystemExit(asyncio.run(apply_pending()))


if __name__ == "__main__":
    main()
