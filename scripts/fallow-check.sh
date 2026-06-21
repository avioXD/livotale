#!/usr/bin/env bash
# Run Fallow duplicate detection when installed: cargo install fallow
# https://github.com/fallow-rs/fallow
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! command -v fallow >/dev/null 2>&1; then
  echo "fallow not installed — skip (cargo install fallow)"
  exit 0
fi

echo "=== apps/ui src ==="
fallow "$ROOT/apps/ui/src" --min-lines 8 || true

echo "=== apps/api app ==="
fallow "$ROOT/apps/api/app" --min-lines 8 || true
