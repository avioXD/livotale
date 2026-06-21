from __future__ import annotations

from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class DashboardEnquiryStats(BaseSchema):
    total: int
    new: int
    converted: int


class DashboardOrderStats(BaseSchema):
    total: int
    payment_pending: int = Field(alias="paymentPending")
    payment_completed: int = Field(alias="paymentCompleted")
    scan_completed: int = Field(alias="scanCompleted")
    lab_pending: int = Field(alias="labPending")
    report_pending: int = Field(alias="reportPending")
    consultation_pending: int = Field(alias="consultationPending")
    prescription_pending: int = Field(alias="prescriptionPending")


class DashboardRevenueStats(BaseSchema):
    total: float
    today: float
    month: float


class PackageSalesRow(BaseSchema):
    package_id: UUID = Field(alias="packageId")
    package_code: str = Field(alias="packageCode")
    package_name: str = Field(alias="packageName")
    order_count: int = Field(alias="orderCount")
    revenue: float


class OrderStatusCount(BaseSchema):
    status: str
    count: int


class LiverCareDashboardSummary(BaseSchema):
    enquiries: DashboardEnquiryStats
    orders: DashboardOrderStats
    revenue: DashboardRevenueStats
    package_sales: list[PackageSalesRow] = Field(alias="packageSales")
    orders_by_status: list[OrderStatusCount] = Field(alias="ordersByStatus")


class LiverCareDashboardFilters(BaseSchema):
    date_from: str | None = Field(default=None, alias="dateFrom")
    date_to: str | None = Field(default=None, alias="dateTo")
    package_id: UUID | None = Field(default=None, alias="packageId")
    order_status: str | None = Field(default=None, alias="orderStatus")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    doctor_id: UUID | None = Field(default=None, alias="doctorId")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    payment_status: str | None = Field(default=None, alias="paymentStatus")


class OperationsOverview(BaseSchema):
    appointments_today: int = Field(alias="appointmentsToday")
    pending_assignments: int = Field(alias="pendingAssignments")
    missed_today: int = Field(alias="missedToday")
    samples_pending_assign: int = Field(alias="samplesPendingAssign")
    unpaid_orders: int = Field(alias="unpaidOrders")
    collected_today: float = Field(alias="collectedToday")
