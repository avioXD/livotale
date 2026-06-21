from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Protocol


class SampleDispatchStatus(StrEnum):
    NOT_REQUIRED = "not_required"
    PENDING_DISPATCH = "pending_dispatch"
    SAMPLE_COLLECTED = "sample_collected"
    DISPATCHED = "dispatched"
    RECEIVED_AT_LAB = "received_at_lab"
    AWAITING_REPORT = "awaiting_report"
    REPORT_UPLOADED = "report_uploaded"
    CANCELLED = "cancelled"


class PathologyWorkflowEvent(StrEnum):
    COLLECT_SAMPLE = "collect_sample"
    DISPATCH = "dispatch"
    MARK_RECEIVED = "mark_received"
    MARK_AWAITING_REPORT = "mark_awaiting_report"
    UPLOAD_REPORT = "upload_report"
    CANCEL = "cancel"


SAMPLE_DISPATCH_FLOW: list[SampleDispatchStatus] = [
    SampleDispatchStatus.PENDING_DISPATCH,
    SampleDispatchStatus.SAMPLE_COLLECTED,
    SampleDispatchStatus.DISPATCHED,
    SampleDispatchStatus.RECEIVED_AT_LAB,
    SampleDispatchStatus.AWAITING_REPORT,
    SampleDispatchStatus.REPORT_UPLOADED,
]

SAMPLE_DISPATCH_LABELS: dict[SampleDispatchStatus, str] = {
    SampleDispatchStatus.NOT_REQUIRED: "Not required",
    SampleDispatchStatus.PENDING_DISPATCH: "Awaiting schedule confirmation",
    SampleDispatchStatus.SAMPLE_COLLECTED: "Sample collected by lab partner",
    SampleDispatchStatus.DISPATCHED: "Handed over to lab",
    SampleDispatchStatus.RECEIVED_AT_LAB: "Lab received — testing",
    SampleDispatchStatus.AWAITING_REPORT: "Awaiting report (email)",
    SampleDispatchStatus.REPORT_UPLOADED: "Lab PDF uploaded",
    SampleDispatchStatus.CANCELLED: "Cancelled",
}

TRANSITIONS: dict[SampleDispatchStatus, dict[PathologyWorkflowEvent, SampleDispatchStatus]] = {
    SampleDispatchStatus.PENDING_DISPATCH: {
        PathologyWorkflowEvent.COLLECT_SAMPLE: SampleDispatchStatus.SAMPLE_COLLECTED,
        PathologyWorkflowEvent.CANCEL: SampleDispatchStatus.CANCELLED,
    },
    SampleDispatchStatus.SAMPLE_COLLECTED: {
        PathologyWorkflowEvent.DISPATCH: SampleDispatchStatus.DISPATCHED,
        # Lab partner home visit: sample goes directly to lab processing (no courier leg).
        PathologyWorkflowEvent.MARK_RECEIVED: SampleDispatchStatus.RECEIVED_AT_LAB,
        PathologyWorkflowEvent.CANCEL: SampleDispatchStatus.CANCELLED,
    },
    SampleDispatchStatus.DISPATCHED: {
        PathologyWorkflowEvent.MARK_RECEIVED: SampleDispatchStatus.RECEIVED_AT_LAB,
    },
    SampleDispatchStatus.RECEIVED_AT_LAB: {
        PathologyWorkflowEvent.MARK_AWAITING_REPORT: SampleDispatchStatus.AWAITING_REPORT,
    },
    SampleDispatchStatus.AWAITING_REPORT: {
        PathologyWorkflowEvent.UPLOAD_REPORT: SampleDispatchStatus.REPORT_UPLOADED,
    },
}


class DispatchLike(Protocol):
    status: str


def dispatch_at_least(current: SampleDispatchStatus | str | None, minimum: SampleDispatchStatus | str) -> bool:
    if current is None:
        return False
    try:
        current_status = SampleDispatchStatus(current)
        minimum_status = SampleDispatchStatus(minimum)
    except ValueError:
        return False
    if current_status is SampleDispatchStatus.CANCELLED or current_status is SampleDispatchStatus.NOT_REQUIRED:
        return False
    try:
        current_index = SAMPLE_DISPATCH_FLOW.index(current_status)
        minimum_index = SAMPLE_DISPATCH_FLOW.index(minimum_status)
    except ValueError:
        return False
    return current_index >= minimum_index


def can_transition(dispatch: DispatchLike, event: PathologyWorkflowEvent | str) -> bool:
    try:
        status = SampleDispatchStatus(dispatch.status)
        event_key = PathologyWorkflowEvent(event)
    except ValueError:
        return False
    return event_key in TRANSITIONS.get(status, {})


@dataclass(frozen=True, slots=True)
class DispatchTransitionResult:
    status: SampleDispatchStatus
    updated_at: datetime


def apply_transition(
    dispatch: DispatchLike,
    event: PathologyWorkflowEvent | str,
) -> DispatchTransitionResult:
    if not can_transition(dispatch, event):
        raise ValueError(f'Cannot apply "{event}" from status "{dispatch.status}"')
    status = SampleDispatchStatus(dispatch.status)
    event_key = PathologyWorkflowEvent(event)
    next_status = TRANSITIONS[status][event_key]
    return DispatchTransitionResult(status=next_status, updated_at=datetime.now(UTC))


def get_applicable_events(dispatch: DispatchLike) -> list[PathologyWorkflowEvent]:
    try:
        status = SampleDispatchStatus(dispatch.status)
    except ValueError:
        return []
    return list(TRANSITIONS.get(status, {}))
