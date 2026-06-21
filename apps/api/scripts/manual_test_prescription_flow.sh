#!/usr/bin/env bash
# Manual API verification for Liver Care prescription + follow-up flow.
# Usage: ./scripts/manual_test_prescription_flow.sh [API_BASE]
set -euo pipefail

API_BASE="${1:-http://localhost:4001/api/v1}"
PASS=0
FAIL=0

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

login() {
  curl -sf -X POST "$API_BASE/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"identifier\":\"$1\",\"password\":\"$2\"}" | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])'
}

ADMIN_TOKEN=$(login abhishek@livotale.com 'Admin@123')
DOCTOR_TOKEN=$(login dr.vijay@livotale.com 'Doctor@123')
TECH_TOKEN=$(login technician@livotale.com 'Tech@123')

auth() { echo "Authorization: Bearer $1"; }

echo "=== Prescription + Follow-up Manual API Test ==="
echo "API: $API_BASE"
echo ""

echo "[1] Running pytest integration suite..."
if (cd "$(dirname "$0")/.." && python3 -m pytest \
  tests/integration/test_pkg3_consultation_prescription.py \
  tests/integration/test_care_recommend_follow_up.py \
  tests/contract/test_prescription_endpoints.py \
  tests/contract/test_consultation_follow_up.py \
  tests/contract/test_care_appointments_endpoints.py \
  -v --tb=line -q); then
  pass "pytest suite"
else
  fail "pytest suite"
fi

echo ""
echo "=== Summary: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
