#!/usr/bin/env bash
# Apply SQL migrations and seed demo/bootstrap users for local development.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT/apps/api"
DATABASE_URL="${DATABASE_URL:-postgresql://livotale_user:password@localhost:5433/livotale}"

echo "Running migrations against $DATABASE_URL"
(
  cd "$API_DIR"
  DATABASE_URL="$DATABASE_URL" node scripts/run-migrations.js
)

echo "Seeding bootstrap users and demo data"
(
  cd "$API_DIR"
  DATABASE_URL="${DATABASE_URL/postgresql:\/\//postgresql+asyncpg:\/\/}" \
    uv run python scripts/seed_project_bootstrap.py
)

echo "Bootstrap complete."
