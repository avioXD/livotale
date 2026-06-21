#!/usr/bin/env python3
"""Manual verification of FibroScan report upload chain against a running API."""

from __future__ import annotations

import argparse
import mimetypes
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx

API_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = "http://localhost:4001/api/v1"
DOWNLOADS = Path.home() / "Downloads"
ALLOWED_SUFFIXES = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}


def _load_base_url() -> str:
    env_path = API_ROOT / ".env"
    if env_path.is_file():
        for line in env_path.read_text().splitlines():
            if line.strip().startswith("PORT="):
                port = line.split("=", 1)[1].strip()
                return f"http://localhost:{port}/api/v1"
    return DEFAULT_BASE


def _discover_file(explicit: Path | None) -> Path:
    if explicit:
        if not explicit.is_file():
            raise SystemExit(f"File not found: {explicit}")
        return explicit
    if not DOWNLOADS.is_dir():
        raise SystemExit(f"No --file given and Downloads not found: {DOWNLOADS}")
    for path in sorted(DOWNLOADS.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if path.is_file() and path.suffix.lower() in ALLOWED_SUFFIXES:
            return path
    raise SystemExit(f"No PDF/image found in {DOWNLOADS}")


def login(base: str, identifier: str, password: str) -> str:
    r = httpx.post(f"{base}/auth/login", json={"identifier": identifier, "password": password}, timeout=30)
    print(f"  login ({identifier}): {r.status_code}")
    if r.status_code != 200:
        print(r.text[:500])
        raise SystemExit(1)
    return r.json()["data"]["accessToken"]


def hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def step(label: str, r: httpx.Response) -> None:
    ok = "PASS" if r.status_code < 400 else "FAIL"
    print(f"  [{ok}] {label}: HTTP {r.status_code}")
    if r.status_code >= 400:
        print(f"       {r.text[:400]}")
        raise SystemExit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify FibroScan report upload APIs")
    parser.add_argument("--order-id", required=True, help="Order UUID")
    parser.add_argument("--file", type=Path, default=None, help="PDF/image path (default: newest in ~/Downloads)")
    parser.add_argument("--base-url", default=_load_base_url())
    args = parser.parse_args()

    file_path = _discover_file(args.file)
    mime_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
    base = args.base_url.rstrip("/")
    order_id = args.order_id

    print(f"API: {base}")
    print(f"Order: {order_id}")
    print(f"File: {file_path} ({mime_type})")

    tech_token = login(base, "technician@livotale.com", "Tech@123")
    th = hdr(tech_token)

    print("\nPrerequisites:")
    for path in (f"/technician/orders/{order_id}", f"/technician/orders/{order_id}/visit", f"/technician/orders/{order_id}/patient-intake"):
        r = httpx.get(f"{base}{path}", headers=th, timeout=30)
        step(path.split("/")[-1], r)

    intake = httpx.get(f"{base}/technician/orders/{order_id}/patient-intake", headers=th, timeout=30).json().get("data") or {}
    if not intake.get("fibroscanIntakeSubmittedAt"):
        print("  [WARN] fibroscan intake not submitted — save_scan may fail")

    print("\nStorage upload:")
    presign = httpx.post(
        f"{base}/storage/presign",
        headers=th,
        json={
            "fileName": file_path.name,
            "mimeType": mime_type,
            "entityType": "fibroscan_report",
            "entityId": order_id,
        },
        timeout=30,
    )
    step("presign", presign)
    presign_data = presign.json()["data"]
    upload_url = presign_data["uploadUrl"]
    file_id = presign_data["fileId"]

    put = httpx.put(upload_url, content=file_path.read_bytes(), headers={"Content-Type": mime_type}, timeout=60)
    print(f"  [{'PASS' if put.status_code < 400 else 'FAIL'}] S3 PUT: HTTP {put.status_code}")
    if put.status_code >= 400:
        print(f"       {put.text[:400]}")
        raise SystemExit(1)

    confirm = httpx.post(f"{base}/storage/{file_id}/confirm", headers=th, timeout=30)
    step("confirm", confirm)
    storage_url = confirm.json()["data"]["storageUrl"]

    print("\nScan attach:")
    now = datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    save = httpx.post(
        f"{base}/technician/orders/{order_id}/fibrosis-scan",
        headers=th,
        json={
            "liverStiffnessKpa": 6.2,
            "capDbm": 250,
            "iqr": 0.8,
            "iqrMedianPercent": 12,
            "validMeasurements": 10,
            "totalMeasurements": 10,
            "successRatePercent": 100,
            "probeType": "M",
            "scanAt": now,
            "operatorName": "Verify Script",
            "deviceSerial": "FS-VERIFY-001",
            "fastingStatus": True,
            "bmi": 24.5,
            "interpretation": "Script verification",
            "steatosisGrade": "S1",
            "fibrosisStage": "F1",
            "source": "manual",
        },
        timeout=30,
    )
    step("save scan KPIs", save)

    attach = httpx.post(
        f"{base}/technician/orders/{order_id}/fibrosis-scan/attach",
        headers=th,
        json={
            "fileName": file_path.name,
            "fileType": mime_type,
            "fileId": str(file_id),
            "storageUrl": storage_url,
            "scanReportDocumentType": "scanner_pdf",
        },
        timeout=30,
    )
    step("attach report", attach)
    attach_data = attach.json()["data"]

    scan = httpx.get(f"{base}/technician/orders/{order_id}/fibrosis-scan", headers=th, timeout=30)
    step("GET scan", scan)
    scan_data = scan.json()["data"]

    if not scan_data.get("scanFileUrl"):
        print("  [FAIL] scanFileUrl missing after attach")
        raise SystemExit(1)

    print("\nAll steps passed.")
    print(f"  scanFileUrl: {scan_data['scanFileUrl']}")
    print(f"  scanReportDocumentType: {attach_data.get('scanReportDocumentType')}")


if __name__ == "__main__":
    main()
