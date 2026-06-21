from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Protocol

from app.domain.package_flags import PackageWorkflowFlags, get_flags_from_package

__all__ = [
    "ORDER_STATUS_FLOW",
    "OrderStatus",
    "OrderWorkflowEvent",
    "PackageWorkflowFlags",
    "TRANSITIONS",
    "apply_transition",
    "can_transition",
    "get_applicable_events",
    "get_order_progress_steps",
    "get_package_flags",
    "skip_pathology_statuses",
]


class OrderStatus(StrEnum):
    DRAFT = "draft"
    CREATED = "created"
    PAYMENT_PENDING = "payment_pending"
    PAYMENT_COMPLETED = "payment_completed"
    TECHNICIAN_ASSIGNED = "technician_assigned"
    SCAN_SCHEDULED = "scan_scheduled"
    SCAN_IN_PROGRESS = "scan_in_progress"
    SCAN_COMPLETED = "scan_completed"
    PATHOLOGY_PENDING = "pathology_pending"
    LAB_REPORT_UPLOADED = "lab_report_uploaded"
    AI_EXTRACTION_PENDING = "ai_extraction_pending"
    AI_EXTRACTION_COMPLETED = "ai_extraction_completed"
    REPORT_REVIEW_PENDING = "report_review_pending"
    FINAL_REPORT_GENERATED = "final_report_generated"
    DOCTOR_ASSIGNMENT_PENDING = "doctor_assignment_pending"
    DOCTOR_ASSIGNED = "doctor_assigned"
    CONSULTATION_PENDING = "consultation_pending"
    PRESCRIPTION_PENDING = "prescription_pending"
    PRESCRIPTION_GENERATED = "prescription_generated"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderWorkflowEvent(StrEnum):
    SUBMIT = "submit"
    REQUEST_PAYMENT = "request_payment"
    PAYMENT_COMPLETED = "payment_completed"
    ASSIGN_TECHNICIAN = "assign_technician"
    SCHEDULE_SCAN = "schedule_scan"
    START_SCAN = "start_scan"
    COMPLETE_SCAN = "complete_scan"
    ASSIGN_LAB = "assign_lab"
    UPLOAD_LAB_REPORT = "upload_lab_report"
    TRIGGER_AI = "trigger_ai"
    VERIFY_AI = "verify_ai"
    GENERATE_REPORT = "generate_report"
    ASSIGN_DOCTOR = "assign_doctor"
    SCHEDULE_CONSULTATION = "schedule_consultation"
    COMPLETE_CONSULTATION = "complete_consultation"
    PUBLISH_PRESCRIPTION = "publish_prescription"
    COMPLETE = "complete"
    CANCEL = "cancel"


ORDER_STATUS_FLOW: list[OrderStatus] = [
    OrderStatus.DRAFT,
    OrderStatus.CREATED,
    OrderStatus.PAYMENT_PENDING,
    OrderStatus.PAYMENT_COMPLETED,
    OrderStatus.TECHNICIAN_ASSIGNED,
    OrderStatus.SCAN_SCHEDULED,
    OrderStatus.SCAN_IN_PROGRESS,
    OrderStatus.SCAN_COMPLETED,
    OrderStatus.PATHOLOGY_PENDING,
    OrderStatus.LAB_REPORT_UPLOADED,
    OrderStatus.AI_EXTRACTION_PENDING,
    OrderStatus.AI_EXTRACTION_COMPLETED,
    OrderStatus.REPORT_REVIEW_PENDING,
    OrderStatus.FINAL_REPORT_GENERATED,
    OrderStatus.DOCTOR_ASSIGNMENT_PENDING,
    OrderStatus.DOCTOR_ASSIGNED,
    OrderStatus.CONSULTATION_PENDING,
    OrderStatus.PRESCRIPTION_PENDING,
    OrderStatus.PRESCRIPTION_GENERATED,
    OrderStatus.COMPLETED,
]

TRANSITIONS: dict[OrderStatus, dict[OrderWorkflowEvent, OrderStatus]] = {
    OrderStatus.DRAFT: {
        OrderWorkflowEvent.SUBMIT: OrderStatus.CREATED,
        OrderWorkflowEvent.CANCEL: OrderStatus.CANCELLED,
    },
    OrderStatus.CREATED: {
        OrderWorkflowEvent.REQUEST_PAYMENT: OrderStatus.PAYMENT_PENDING,
        OrderWorkflowEvent.PAYMENT_COMPLETED: OrderStatus.PAYMENT_COMPLETED,
        OrderWorkflowEvent.CANCEL: OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_PENDING: {
        OrderWorkflowEvent.PAYMENT_COMPLETED: OrderStatus.PAYMENT_COMPLETED,
        OrderWorkflowEvent.CANCEL: OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_COMPLETED: {
        OrderWorkflowEvent.ASSIGN_TECHNICIAN: OrderStatus.TECHNICIAN_ASSIGNED,
        OrderWorkflowEvent.CANCEL: OrderStatus.CANCELLED,
    },
    OrderStatus.TECHNICIAN_ASSIGNED: {
        OrderWorkflowEvent.SCHEDULE_SCAN: OrderStatus.SCAN_SCHEDULED,
    },
    OrderStatus.SCAN_SCHEDULED: {
        OrderWorkflowEvent.START_SCAN: OrderStatus.SCAN_IN_PROGRESS,
    },
    OrderStatus.SCAN_IN_PROGRESS: {
        OrderWorkflowEvent.COMPLETE_SCAN: OrderStatus.SCAN_COMPLETED,
    },
    OrderStatus.SCAN_COMPLETED: {
        OrderWorkflowEvent.ASSIGN_LAB: OrderStatus.PATHOLOGY_PENDING,
        OrderWorkflowEvent.TRIGGER_AI: OrderStatus.AI_EXTRACTION_PENDING,
        OrderWorkflowEvent.GENERATE_REPORT: OrderStatus.REPORT_REVIEW_PENDING,
    },
    OrderStatus.PATHOLOGY_PENDING: {
        OrderWorkflowEvent.UPLOAD_LAB_REPORT: OrderStatus.LAB_REPORT_UPLOADED,
    },
    OrderStatus.LAB_REPORT_UPLOADED: {
        OrderWorkflowEvent.TRIGGER_AI: OrderStatus.AI_EXTRACTION_PENDING,
    },
    OrderStatus.AI_EXTRACTION_PENDING: {
        OrderWorkflowEvent.VERIFY_AI: OrderStatus.AI_EXTRACTION_COMPLETED,
    },
    OrderStatus.AI_EXTRACTION_COMPLETED: {
        OrderWorkflowEvent.GENERATE_REPORT: OrderStatus.REPORT_REVIEW_PENDING,
    },
    OrderStatus.REPORT_REVIEW_PENDING: {
        OrderWorkflowEvent.GENERATE_REPORT: OrderStatus.FINAL_REPORT_GENERATED,
    },
    OrderStatus.FINAL_REPORT_GENERATED: {
        OrderWorkflowEvent.ASSIGN_DOCTOR: OrderStatus.DOCTOR_ASSIGNMENT_PENDING,
        OrderWorkflowEvent.COMPLETE: OrderStatus.COMPLETED,
    },
    OrderStatus.DOCTOR_ASSIGNMENT_PENDING: {
        OrderWorkflowEvent.ASSIGN_DOCTOR: OrderStatus.DOCTOR_ASSIGNED,
    },
    OrderStatus.DOCTOR_ASSIGNED: {
        OrderWorkflowEvent.SCHEDULE_CONSULTATION: OrderStatus.CONSULTATION_PENDING,
    },
    OrderStatus.CONSULTATION_PENDING: {
        OrderWorkflowEvent.COMPLETE_CONSULTATION: OrderStatus.PRESCRIPTION_PENDING,
    },
    OrderStatus.PRESCRIPTION_PENDING: {
        OrderWorkflowEvent.PUBLISH_PRESCRIPTION: OrderStatus.PRESCRIPTION_GENERATED,
    },
    OrderStatus.PRESCRIPTION_GENERATED: {
        OrderWorkflowEvent.COMPLETE: OrderStatus.COMPLETED,
    },
}


class OrderLike(Protocol):
    order_status: str


def get_package_flags(pkg: object) -> PackageWorkflowFlags:
    """Return workflow flags for a package (ORM row or dict-like object)."""
    if hasattr(pkg, "pathology_included"):
        return get_flags_from_package(pkg)  # type: ignore[arg-type]
    if isinstance(pkg, dict):
        return PackageWorkflowFlags(
            pathology=bool(pkg.get("pathology_included") or pkg.get("pathologyIncluded")),
            consultation=bool(pkg.get("consultation_included") or pkg.get("consultationIncluded")),
        )
    raise TypeError("Package must expose pathology/consultation inclusion flags")


def can_transition(order: OrderLike, event: OrderWorkflowEvent | str, flags: PackageWorkflowFlags) -> bool:
    status = OrderStatus(order.order_status)
    event_key = OrderWorkflowEvent(event)
    next_status = TRANSITIONS.get(status, {}).get(event_key)
    if next_status is None:
        return False

    if event_key is OrderWorkflowEvent.ASSIGN_LAB and not flags.pathology:
        return False
    if event_key is OrderWorkflowEvent.ASSIGN_DOCTOR and not flags.consultation:
        return False
    if (
        event_key is OrderWorkflowEvent.COMPLETE
        and status is OrderStatus.SCAN_COMPLETED
        and flags.pathology
    ):
        return False
    if (
        event_key is OrderWorkflowEvent.COMPLETE
        and status is OrderStatus.FINAL_REPORT_GENERATED
        and flags.consultation
    ):
        return False

    return True


@dataclass(frozen=True, slots=True)
class OrderTransitionResult:
    order_status: OrderStatus
    updated_at: datetime


def apply_transition(
    order: OrderLike,
    event: OrderWorkflowEvent | str,
    flags: PackageWorkflowFlags,
) -> OrderTransitionResult:
    if not can_transition(order, event, flags):
        raise ValueError(f'Cannot apply "{event}" from status "{order.order_status}"')
    status = OrderStatus(order.order_status)
    event_key = OrderWorkflowEvent(event)
    next_status = TRANSITIONS[status][event_key]
    return OrderTransitionResult(order_status=next_status, updated_at=datetime.now(UTC))


def get_applicable_events(order: OrderLike, flags: PackageWorkflowFlags) -> list[OrderWorkflowEvent]:
    status = OrderStatus(order.order_status)
    events = list(TRANSITIONS.get(status, {}))
    return [event for event in events if can_transition(order, event, flags)]


def skip_pathology_statuses(flags: PackageWorkflowFlags) -> list[OrderStatus]:
    if flags.pathology:
        return []
    return [OrderStatus.PATHOLOGY_PENDING, OrderStatus.LAB_REPORT_UPLOADED]


def get_order_progress_steps(flags: PackageWorkflowFlags) -> list[OrderStatus]:
    steps = [s for s in ORDER_STATUS_FLOW if s not in (OrderStatus.DRAFT, OrderStatus.CANCELLED)]
    if not flags.pathology:
        skipped = set(skip_pathology_statuses(flags))
        steps = [s for s in steps if s not in skipped]
    if not flags.consultation:
        consultation_steps = {
            OrderStatus.DOCTOR_ASSIGNMENT_PENDING,
            OrderStatus.DOCTOR_ASSIGNED,
            OrderStatus.CONSULTATION_PENDING,
            OrderStatus.PRESCRIPTION_PENDING,
            OrderStatus.PRESCRIPTION_GENERATED,
        }
        steps = [s for s in steps if s not in consultation_steps]
    return steps
