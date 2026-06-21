from app.domain.order_workflow import OrderStatus, OrderWorkflowEvent, PackageWorkflowFlags, apply_transition, can_transition


class _Order:
    def __init__(self, status: str):
        self.order_status = status


def test_payment_completed_from_payment_pending():
    order = _Order(OrderStatus.PAYMENT_PENDING)
    flags = PackageWorkflowFlags(pathology=True, consultation=True)
    assert can_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags)
    result = apply_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags)
    assert result.order_status == OrderStatus.PAYMENT_COMPLETED


def test_assign_lab_requires_pathology_flag():
    order = _Order(OrderStatus.SCAN_COMPLETED)
    without_pathology = PackageWorkflowFlags(pathology=False, consultation=False)
    with_pathology = PackageWorkflowFlags(pathology=True, consultation=False)
    assert not can_transition(order, OrderWorkflowEvent.ASSIGN_LAB, without_pathology)
    assert can_transition(order, OrderWorkflowEvent.ASSIGN_LAB, with_pathology)


def test_complete_after_final_report_without_consultation():
    order = _Order(OrderStatus.FINAL_REPORT_GENERATED)
    flags = PackageWorkflowFlags(pathology=False, consultation=False)
    assert can_transition(order, OrderWorkflowEvent.COMPLETE, flags)
    result = apply_transition(order, OrderWorkflowEvent.COMPLETE, flags)
    assert result.order_status == OrderStatus.COMPLETED
