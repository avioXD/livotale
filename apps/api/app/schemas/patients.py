from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class PatientListItem(BaseSchema):
    patient_id: UUID = Field(alias="patientId")
    patient_code: str = Field(alias="patientCode")
    full_name: str = Field(alias="fullName")
    mobile: str | None = None
    bmi: float | None = None
    risk_score: float | None = Field(default=None, alias="riskScore")
    liver_score: float | None = Field(default=None, alias="liverScore")
    journey_status: str | None = Field(default=None, alias="journeyStatus")
    primary_doctor_name: str | None = Field(default=None, alias="primaryDoctorName")


class PaginatedPatients(BaseSchema):
    items: list[PatientListItem]
    total: int
    page: int
    page_size: int = Field(alias="pageSize")
    total_pages: int = Field(alias="totalPages")


class PatientSummaryCard(BaseSchema):
    patient_code: str = Field(alias="patientCode")
    name: str
    age_gender: str = Field(alias="ageGender")
    bmi: float | None = None
    risk_category: str = Field(alias="riskCategory")
    diagnosis: str | None = None
    diabetes: str | None = None
    alcohol: str | None = None
    current_plan: str | None = Field(default=None, alias="currentPlan")
    liver_score: float | None = Field(default=None, alias="liverScore")
    fibrosis_stage: str | None = Field(default=None, alias="fibrosisStage")
    alerts: list[str] = Field(default_factory=list)
    journey_status: str | None = Field(default=None, alias="journeyStatus")


class PatientDetail(BaseSchema):
    patient: dict[str, Any]
    dashboard: dict[str, Any] | None = None
    summary_card: PatientSummaryCard = Field(alias="summaryCard")
    addresses: list[dict[str, Any]] = Field(default_factory=list)
    allergy_alerts: list[dict[str, Any]] = Field(default_factory=list, alias="allergyAlerts")


class PatientClinicalContext(BaseSchema):
    orders: list[dict[str, Any]]
    payments: list[dict[str, Any]]
    pathology_reports: list[dict[str, Any]] = Field(default_factory=list, alias="pathologyReports")
    scans: list[dict[str, Any]] = Field(default_factory=list)
    appointments: list[dict[str, Any]] = Field(default_factory=list)
    reports: list[dict[str, Any]] = Field(default_factory=list)
