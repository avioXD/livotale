from __future__ import annotations

import re
from typing import Protocol


class EnquiryThreadRow(Protocol):
    phone: str
    patient_id: object | None


def normalize_enquiry_phone(phone: str) -> str:
    return re.sub(r"\D", "", phone)


def thread_id_from_phone(phone: str) -> str:
    return f"thread-{normalize_enquiry_phone(phone)}"


def next_thread_sequence(siblings: list[EnquiryThreadRow], thread_id: str) -> int:
    if not siblings:
        return 1
    return max((getattr(row, "thread_sequence", idx + 1) for idx, row in enumerate(siblings)), default=0) + 1


def inherited_patient_id_from_thread(rows: list[EnquiryThreadRow]) -> object | None:
    with_patient = [row for row in rows if row.patient_id is not None]
    if not with_patient:
        return None
    return with_patient[-1].patient_id


def latest_per_thread(enquiries: list[dict]) -> list[dict]:
    latest: dict[str, dict] = {}
    for row in enquiries:
        thread_id = row["threadId"]
        current = latest.get(thread_id)
        if current is None or row["threadSequence"] > current["threadSequence"]:
            latest[thread_id] = row
    return list(latest.values())


def thread_counts(enquiries: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for row in enquiries:
        thread_id = row["threadId"]
        counts[thread_id] = counts.get(thread_id, 0) + 1
    return counts
