from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.enquiry_thread import inherited_patient_id_from_thread, latest_per_thread, thread_counts, thread_id_from_phone
from app.domain.serial_numbers import next_enquiry_number
from app.models.operations import Enquiry, EnquiryFollowUpLog
from app.repositories.enquiry_repo import EnquiryRepository
from app.schemas.enquiries import AddEnquiryFollowUpInput, CreateEnquiryInput, UpdateEnquiryInput
from app.services.workflow_notifications import WorkflowNotificationService


class EnquiryService:
    def __init__(self, session: AsyncSession):
        self.repo = EnquiryRepository(session)

    async def list_enquiries(
        self,
        *,
        status: str | None = None,
        source: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        rows = await self.repo.search(status=status, source=source, search=search)
        mapped = [await self._to_dict(row, include_logs=False) for row in rows]
        counts = thread_counts(mapped)
        latest = latest_per_thread(mapped)
        for item in latest:
            item["threadCount"] = counts.get(item["threadId"], 1)
        latest.sort(key=lambda row: row["enquiryAt"], reverse=True)
        return latest

    async def get_by_id(self, enquiry_id: UUID, *, include_logs: bool = True) -> dict:
        row = await self.repo.get_by_id(enquiry_id)
        if row is None:
            raise AppError("Enquiry not found", status_code=404, error="not_found")
        return await self._to_dict(row, include_logs=include_logs)

    async def get_thread(self, thread_id: str) -> list[dict]:
        phone = thread_id.removeprefix("thread-")
        rows = await self.repo.list_by_phone(phone)
        if not rows:
            raise AppError("Thread not found", status_code=404, error="not_found")
        mapped = [await self._to_dict(row, include_logs=True) for row in rows]
        mapped.sort(key=lambda row: row["threadSequence"])
        return mapped

    async def create(self, payload: CreateEnquiryInput, *, actor_id: UUID | None) -> dict:
        siblings = await self.repo.list_by_phone(payload.phone)
        inherited_patient_id = inherited_patient_id_from_thread(siblings)
        thread_sequence = len(siblings) + 1

        enquiry = Enquiry(
            enquiry_number=await next_enquiry_number(self.repo.session),
            source=payload.source,
            patient_name=payload.patient_name,
            phone=payload.phone,
            email=payload.email,
            age=payload.age,
            gender=payload.gender,
            city=payload.city,
            address=payload.address,
            preferred_package_id=payload.preferred_package_id,
            message=payload.message,
            enquiry_at=datetime.now(UTC),
            status="new",
            patient_id=inherited_patient_id,
            created_by=actor_id,
            updated_by=actor_id,
        )
        saved = await self.repo.add(enquiry)
        return await self._to_dict(saved, include_logs=False, thread_sequence=thread_sequence)

    async def create_new_thread(self, from_enquiry_id: UUID, *, message: str | None, actor_id: UUID | None) -> dict:
        parent = await self.repo.get_by_id(from_enquiry_id)
        if parent is None:
            raise AppError("Enquiry not found", status_code=404, error="not_found")
        payload = CreateEnquiryInput(
            source="manual",
            patient_name=parent.patient_name,
            phone=parent.phone,
            email=parent.email,
            city=parent.city,
            preferred_package_id=parent.preferred_package_id,
            message=message or "Return enquiry — patient contacted ops again.",
        )
        return await self.create(payload, actor_id=actor_id)

    async def add_follow_up(
        self,
        enquiry_id: UUID,
        payload: AddEnquiryFollowUpInput,
        *,
        actor_id: UUID | None,
        actor_name: str | None,
    ) -> dict:
        enquiry = await self.repo.get_by_id(enquiry_id)
        if enquiry is None:
            raise AppError("Enquiry not found", status_code=404, error="not_found")

        log = EnquiryFollowUpLog(
            enquiry_id=enquiry.id,
            status=payload.status,
            internal_notes=(payload.internal_notes or "").strip() or None,
            call_remarks=(payload.call_remarks or "").strip() or None,
            follow_up_at=payload.follow_up_at,
            created_by=actor_id,
        )
        await self.repo.add_follow_up(log)

        enquiry.status = payload.status
        enquiry.follow_up_at = payload.follow_up_at
        if payload.internal_notes is not None:
            enquiry.internal_notes = payload.internal_notes.strip() or None
        if payload.call_remarks is not None:
            enquiry.call_remarks = payload.call_remarks.strip() or None
        enquiry.updated_by = actor_id
        saved = await self.repo.save(enquiry)
        return await self._to_dict(
            saved,
            include_logs=True,
            created_by_name_override={log.id: payload.created_by_name or actor_name or "Operations Team"},
        )

    async def update(self, enquiry_id: UUID, payload: UpdateEnquiryInput, *, actor_id: UUID | None) -> dict:
        enquiry = await self.repo.get_by_id(enquiry_id)
        if enquiry is None:
            raise AppError("Enquiry not found", status_code=404, error="not_found")

        previous_executive_id = enquiry.assigned_executive_id

        data = payload.model_dump(by_alias=True, exclude_unset=True)
        field_map = {
            "status": "status",
            "assignedExecutiveId": "assigned_executive_id",
            "followUpAt": "follow_up_at",
            "internalNotes": "internal_notes",
            "callRemarks": "call_remarks",
            "patientName": "patient_name",
            "phone": "phone",
            "email": "email",
            "age": "age",
            "gender": "gender",
            "city": "city",
            "address": "address",
            "message": "message",
            "preferredPackageId": "preferred_package_id",
            "orderOutcome": "order_outcome",
            "orderOutcomeRemarks": "order_outcome_remarks",
        }
        for key, attr in field_map.items():
            if key in data:
                setattr(enquiry, attr, data[key])

        enquiry.updated_by = actor_id
        saved = await self.repo.save(enquiry)
        result = await self._to_dict(saved, include_logs=True)

        new_executive_id = saved.assigned_executive_id
        if (
            "assignedExecutiveId" in data
            and new_executive_id
            and new_executive_id != previous_executive_id
        ):
            await WorkflowNotificationService(self.repo.session).enquiry_assigned(
                patient_name=saved.patient_name,
                assignee_user_id=new_executive_id,
                enquiry_number=saved.enquiry_number,
            )

        return result

    async def soft_delete(self, enquiry_id: UUID, *, actor_id: UUID | None) -> None:
        enquiry = await self.repo.get_by_id(enquiry_id)
        if enquiry is None:
            raise AppError("Enquiry not found", status_code=404, error="not_found")
        enquiry.deleted_at = datetime.now(UTC)
        enquiry.updated_by = actor_id
        await self.repo.save(enquiry)

    async def _to_dict(
        self,
        enquiry: Enquiry,
        *,
        include_logs: bool,
        thread_sequence: int | None = None,
        created_by_name_override: dict[UUID, str] | None = None,
    ) -> dict:
        thread_id = thread_id_from_phone(enquiry.phone)
        if thread_sequence is None:
            siblings = await self.repo.list_by_phone(enquiry.phone)
            thread_sequence = next((idx + 1 for idx, row in enumerate(siblings) if row.id == enquiry.id), len(siblings))

        assigned_name = await self.repo.get_executive_name(enquiry.assigned_executive_id)
        package_code = await self.repo.get_package_code(enquiry.preferred_package_id)

        result = {
            "id": enquiry.id,
            "enquiryNumber": enquiry.enquiry_number,
            "threadId": thread_id,
            "threadSequence": thread_sequence,
            "source": enquiry.source,
            "patientName": enquiry.patient_name,
            "phone": enquiry.phone,
            "email": enquiry.email,
            "age": enquiry.age,
            "gender": enquiry.gender,
            "city": enquiry.city,
            "address": enquiry.address,
            "preferredPackageId": enquiry.preferred_package_id,
            "preferredPackageCode": package_code,
            "message": enquiry.message,
            "enquiryAt": enquiry.enquiry_at,
            "assignedExecutiveId": enquiry.assigned_executive_id,
            "assignedExecutiveName": assigned_name,
            "status": enquiry.status,
            "followUpAt": enquiry.follow_up_at,
            "internalNotes": enquiry.internal_notes,
            "callRemarks": enquiry.call_remarks,
            "patientId": enquiry.patient_id,
            "orderId": enquiry.order_id,
            "orderOutcome": enquiry.order_outcome,
            "orderOutcomeRemarks": enquiry.order_outcome_remarks,
            "createdAt": enquiry.created_at,
            "updatedAt": enquiry.updated_at,
        }

        if include_logs:
            logs = await self.repo.list_follow_ups(enquiry.id)
            follow_up_logs = []
            for log in logs:
                creator_name = None
                if created_by_name_override and log.id in created_by_name_override:
                    creator_name = created_by_name_override[log.id]
                elif log.created_by:
                    creator_name = await self.repo.get_executive_name(log.created_by)
                follow_up_logs.append(
                    {
                        "id": log.id,
                        "status": log.status,
                        "internalNotes": log.internal_notes,
                        "callRemarks": log.call_remarks,
                        "followUpAt": log.follow_up_at,
                        "createdAt": log.created_at,
                        "createdByName": creator_name,
                    }
                )
            result["followUpLogs"] = follow_up_logs

        return result
