#!/usr/bin/env python3
"""Drop and recreate the Livotale database, apply all SQL migrations, then seed bootstrap data."""

from __future__ import annotations

import asyncio
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse

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


def _normalize_pg_url(database_url: str) -> tuple[str, str, str, int, str, str]:
    """Return (admin_url, db_name, user, host, port, password) for asyncpg."""
    raw = database_url.replace("postgresql+asyncpg://", "postgresql://")
    parsed = urlparse(raw)
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise SystemExit(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")
    db_name = parsed.path.lstrip("/")
    if not db_name:
        raise SystemExit("DATABASE_URL must include a database name")
    user = unquote(parsed.username or "")
    password = unquote(parsed.password or "")
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432
    admin_url = f"postgresql://{user}:{password}@{host}:{port}/postgres"
    target_url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
    return admin_url, target_url, db_name, user, host, port, password


def _migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


async def _terminate_connections(conn: asyncpg.Connection, db_name: str) -> None:
    await conn.execute(
        """
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
        """,
        db_name,
    )


async def _drop_and_create(admin_url: str, db_name: str) -> None:
    conn = await asyncpg.connect(admin_url)
    try:
        print(f"Terminating active connections to {db_name!r}...")
        await _terminate_connections(conn, db_name)
        print(f"Dropping database {db_name!r}...")
        await conn.execute(f'DROP DATABASE IF EXISTS "{db_name}"')
        print(f"Creating database {db_name!r}...")
        await conn.execute(f'CREATE DATABASE "{db_name}"')
    finally:
        await conn.close()


async def _apply_migration(conn: asyncpg.Connection, path: Path) -> None:
    sql = path.read_text(encoding="utf-8")
    # asyncpg executes one statement at a time; split on semicolons outside $$ blocks.
    statements = _split_sql_statements(sql)
    for statement in statements:
        stmt = statement.strip()
        if stmt:
            await conn.execute(stmt)


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
                elif occurrences >= 2:
                    pass
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


async def _run_migrations(target_url: str) -> None:
    files = _migration_files()
    if not files:
        raise SystemExit(f"No migration files found in {MIGRATIONS_DIR}")
    conn = await asyncpg.connect(target_url)
    try:
        for path in files:
            print(f"Applying {path.name}...")
            await _apply_migration(conn, path)
        print(f"Applied {len(files)} migrations.")
    finally:
        await conn.close()


async def _run_seed() -> None:
    sys.path.insert(0, str(API_ROOT))
    sys.path.insert(0, str(API_ROOT / "scripts"))
    from seed_project_bootstrap import main as seed_main

    print("Running bootstrap seed...")
    await seed_main()
    print("Seed complete.")


async def main() -> None:
    database_url = _load_database_url()
    admin_url, target_url, db_name, *_ = _normalize_pg_url(database_url)

    print(f"Target database: {db_name}")
    print(f"Migrations dir: {MIGRATIONS_DIR}")

    await _drop_and_create(admin_url, db_name)
    await _run_migrations(target_url)
    await _run_seed()

    print("\nDatabase reset complete.")


if __name__ == "__main__":
    asyncio.run(main())
