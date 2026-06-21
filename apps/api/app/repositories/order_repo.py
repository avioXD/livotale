from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.clinical import Patient
from app.models.commerce import LiverCarePackage, OrderPayment, OrderTimelineEvent, ServiceOrder
from app.models.identity import Role, User, UserRole


from app.services.ops_scope_service import DashboardScope, build_order_pincode_exists_sql


def _apply_order_scope(stmt, scope: DashboardScope | None):
    if scope is None or scope.unrestricted or not scope.pincodes:
        return stmt
    return stmt.where(
        text(build_order_pincode_exists_sql()).bindparams(scope_pincodes=scope.pincodes)
    )


class OrderRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_orders(
        self,
        *,
        payment_status: str | None = None,
        order_status: str | None = None,
        created_by: UUID | None = None,
        created_by_role: str | None = None,
        assigned_to: str | None = None,
        search: str | None = None,
    ) -> list[ServiceOrder]:
        stmt = select(ServiceOrder).where(ServiceOrder.deleted_at.is_(None))
        if payment_status:
            if payment_status == "unpaid":
                stmt = stmt.where(ServiceOrder.payment_status != "success")
            else:
                stmt = stmt.where(ServiceOrder.payment_status == payment_status)
        if order_status:
            stmt = stmt.where(ServiceOrder.order_status == order_status)
        if created_by:
            stmt = stmt.where(ServiceOrder.created_by == created_by)
        if created_by_role:
            role_code = "support" if created_by_role == "operations" else created_by_role
            creator_ids = (
                select(UserRole.user_id)
                .join(Role, Role.id == UserRole.role_id)
                .where(Role.code == role_code)
            )
            stmt = stmt.where(ServiceOrder.created_by.in_(creator_ids))
        if assigned_to:
            if assigned_to == "unassigned":
                stmt = stmt.where(
                    ServiceOrder.technician_id.is_(None),
                    ServiceOrder.doctor_id.is_(None),
                    ServiceOrder.partner_lab_id.is_(None),
                )
            else:
                assignee = UUID(assigned_to)
                stmt = stmt.where(
                    or_(
                        ServiceOrder.technician_id == assignee,
                        ServiceOrder.doctor_id == assignee,
                        ServiceOrder.partner_lab_id == assignee,
                    )
                )
        if search:
            pattern = f"%{search.strip()}%"
            patient_user = aliased(User)
            stmt = (
                stmt.join(Patient, Patient.id == ServiceOrder.patient_id)
                .join(patient_user, patient_user.id == Patient.user_id)
                .where(
                    or_(
                        ServiceOrder.order_number.ilike(pattern),
                        ServiceOrder.package_name.ilike(pattern),
                        patient_user.full_name.ilike(pattern),
                        patient_user.mobile.ilike(pattern),
                    )
                )
            )
        stmt = stmt.order_by(ServiceOrder.updated_at.desc(), ServiceOrder.created_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, order_id: UUID, *, for_update: bool = False) -> ServiceOrder | None:
        stmt = select(ServiceOrder).where(ServiceOrder.id == order_id, ServiceOrder.deleted_at.is_(None))
        if for_update:
            stmt = stmt.with_for_update()
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_package(self, package_id: UUID) -> LiverCarePackage | None:
        result = await self.session.execute(
            select(LiverCarePackage).where(
                LiverCarePackage.id == package_id,
                LiverCarePackage.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def add(self, order: ServiceOrder) -> ServiceOrder:
        self.session.add(order)
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def save(self, order: ServiceOrder) -> ServiceOrder:
        await self.session.flush()
        await self.session.refresh(order)
        return order

    async def package_referenced(self, package_id: UUID) -> bool:
        result = await self.session.execute(
            select(ServiceOrder.id).where(ServiceOrder.package_id == package_id).limit(1)
        )
        return result.scalar_one_or_none() is not None

    async def list_timeline(self, order_id: UUID) -> list[OrderTimelineEvent]:
        result = await self.session.execute(
            select(OrderTimelineEvent)
            .where(OrderTimelineEvent.order_id == order_id)
            .order_by(OrderTimelineEvent.occurred_at.asc())
        )
        return list(result.scalars().all())

    async def add_timeline_event(self, event: OrderTimelineEvent) -> OrderTimelineEvent:
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def add_payment(self, payment: OrderPayment) -> OrderPayment:
        self.session.add(payment)
        await self.session.flush()
        await self.session.refresh(payment)
        return payment

    async def list_payments(self, order_id: UUID) -> list[OrderPayment]:
        result = await self.session.execute(
            select(OrderPayment).where(OrderPayment.order_id == order_id).order_by(OrderPayment.created_at.asc())
        )
        return list(result.scalars().all())

    async def get_patient_profile(self, patient_id: UUID) -> dict | None:
        result = await self.session.execute(
            text(
                """
                SELECT p.id, u.full_name, u.mobile, u.email, p.preferred_language
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE p.id = :patient_id AND p.status = 'active'
                """
            ),
            {"patient_id": patient_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def get_user_name(self, user_id: UUID | None) -> str | None:
        if user_id is None:
            return None
        result = await self.session.execute(
            text("SELECT full_name FROM identity.users WHERE id = :user_id"),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return row["full_name"] if row else None

    async def get_doctor_name(self, doctor_id: UUID | None) -> str | None:
        if doctor_id is None:
            return None
        result = await self.session.execute(
            text(
                """
                SELECT u.full_name
                FROM clinical.doctors d
                JOIN identity.users u ON u.id = d.user_id
                WHERE d.id = :doctor_id
                """
            ),
            {"doctor_id": doctor_id},
        )
        row = result.mappings().first()
        return row["full_name"] if row else None

    async def get_doctor_user_id(self, doctor_id: UUID | None) -> UUID | None:
        if doctor_id is None:
            return None
        result = await self.session.execute(
            text("SELECT user_id FROM clinical.doctors WHERE id = :doctor_id"),
            {"doctor_id": doctor_id},
        )
        row = result.mappings().first()
        return row["user_id"] if row else None

    async def get_lab_name(self, lab_id: UUID | None) -> str | None:
        if lab_id is None:
            return None
        from app.models.operations import LabPartner

        result = await self.session.execute(select(LabPartner.name).where(LabPartner.id == lab_id))
        return result.scalar_one_or_none()

    async def dashboard_orders(
        self,
        *,
        package_id: UUID | None = None,
        order_status: str | None = None,
        payment_status: str | None = None,
        technician_id: UUID | None = None,
        doctor_id: UUID | None = None,
        partner_lab_id: UUID | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        scope: DashboardScope | None = None,
    ) -> list[ServiceOrder]:
        stmt = select(ServiceOrder).where(ServiceOrder.deleted_at.is_(None))
        stmt = _apply_order_scope(stmt, scope)
        if package_id:
            stmt = stmt.where(ServiceOrder.package_id == package_id)
        if order_status:
            stmt = stmt.where(ServiceOrder.order_status == order_status)
        if payment_status:
            if payment_status == "unpaid":
                stmt = stmt.where(ServiceOrder.payment_status != "success")
            else:
                stmt = stmt.where(ServiceOrder.payment_status == payment_status)
        if technician_id:
            stmt = stmt.where(ServiceOrder.technician_id == technician_id)
        if doctor_id:
            stmt = stmt.where(ServiceOrder.doctor_id == doctor_id)
        if partner_lab_id:
            stmt = stmt.where(ServiceOrder.partner_lab_id == partner_lab_id)
        if date_from:
            stmt = stmt.where(ServiceOrder.created_at >= date_from)
        if date_to:
            stmt = stmt.where(ServiceOrder.created_at <= date_to)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def sum_collected_today(self, scope: DashboardScope | None = None) -> Decimal:
        scope_sql = ""
        params: dict = {}
        if scope and scope.is_scoped() and scope.pincodes:
            scope_sql = f"""
              AND EXISTS (
                SELECT 1
                FROM commerce.service_orders o
                JOIN commerce.order_payments op ON op.order_id = o.id
                JOIN clinical.patient_addresses pa
                  ON pa.patient_id = o.patient_id AND pa.is_default = true
                WHERE op.id = commerce.order_payments.id
                  AND o.deleted_at IS NULL
                  AND pa.pincode = ANY(:scope_pincodes)
              )
            """
            params["scope_pincodes"] = scope.pincodes
        result = await self.session.execute(
            text(
                f"""
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM commerce.order_payments
                WHERE status = 'success'
                  AND paid_at >= date_trunc('day', now())
                  {scope_sql}
                """
            ),
            params,
        )
        row = result.mappings().first()
        return Decimal(str(row["total"] if row else 0))

    async def count_unpaid_orders(self, scope: DashboardScope | None = None) -> int:
        stmt = (
            select(func.count())
            .select_from(ServiceOrder)
            .where(
                ServiceOrder.deleted_at.is_(None),
                ServiceOrder.payment_status != "success",
                ServiceOrder.order_status != "cancelled",
            )
        )
        stmt = _apply_order_scope(stmt, scope)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def count_pending_assignments(self, scope: DashboardScope | None = None) -> int:
        stmt = (
            select(func.count())
            .select_from(ServiceOrder)
            .where(
                ServiceOrder.deleted_at.is_(None),
                ServiceOrder.payment_status == "success",
                ServiceOrder.technician_id.is_(None),
                ServiceOrder.order_status.in_(["payment_completed", "created"]),
            )
        )
        stmt = _apply_order_scope(stmt, scope)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())

    async def count_samples_pending(self, scope: DashboardScope | None = None) -> int:
        stmt = (
            select(func.count())
            .select_from(ServiceOrder)
            .where(
                ServiceOrder.deleted_at.is_(None),
                ServiceOrder.order_status == "pathology_pending",
                ServiceOrder.partner_lab_id.is_(None),
            )
        )
        stmt = _apply_order_scope(stmt, scope)
        result = await self.session.execute(stmt)
        return int(result.scalar_one())
