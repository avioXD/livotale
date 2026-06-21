from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema

BloodCollectionTiming = Literal["before_scan", "after_scan"]


class PackageChecklistItem(BaseSchema):
    id: str
    label: str
    included: bool
    detail: str | None = None


class PackageChecklistSection(BaseSchema):
    id: str
    title: str
    items: list[PackageChecklistItem]


class PackageHighlight(BaseSchema):
    label: str
    value: str


class PackageFaq(BaseSchema):
    question: str
    answer: str


class PackageIncludes(BaseSchema):
    bullets: list[str] = Field(default_factory=list)


class PackageTestCategory(BaseSchema):
    id: str
    name: str
    tests: list[str]


class LiverCarePackage(BaseSchema):
    id: UUID
    code: str
    name: str
    subtitle: str | None = None
    description: str
    tagline: str | None = None
    price: float
    discount_price: float | None = Field(default=None, alias="discountPrice")
    includes: PackageIncludes
    checklist_sections: list[PackageChecklistSection] = Field(alias="checklistSections")
    highlights: list[PackageHighlight] = Field(default_factory=list)
    preparation: list[str] = Field(default_factory=list)
    who_should_book: list[str] = Field(alias="whoShouldBook", default_factory=list)
    faqs: list[PackageFaq] = Field(default_factory=list)
    fibrosis_scan_included: bool = Field(alias="fibrosisScanIncluded")
    pathology_included: bool = Field(alias="pathologyIncluded")
    consultation_included: bool = Field(alias="consultationIncluded")
    blood_collection_timing: BloodCollectionTiming | None = Field(default=None, alias="bloodCollectionTiming")
    visibility_web: bool = Field(alias="visibilityWeb")
    active: bool
    sort_order: int = Field(alias="sortOrder")
    terms_conditions: str | None = Field(default=None, alias="termsConditions")
    recommended_tag: bool = Field(default=False, alias="recommendedTag")
    test_count_total: int | None = Field(default=None, alias="testCountTotal")
    test_categories: list[PackageTestCategory] | None = Field(default=None, alias="testCategories")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CreatePackageInput(BaseSchema):
    code: str
    name: str
    subtitle: str | None = None
    description: str
    tagline: str | None = None
    price: float
    discount_price: float | None = Field(default=None, alias="discountPrice")
    includes: PackageIncludes | None = None
    checklist_sections: list[PackageChecklistSection] | None = Field(default=None, alias="checklistSections")
    highlights: list[PackageHighlight] | None = None
    preparation: list[str] = Field(default_factory=list)
    who_should_book: list[str] = Field(alias="whoShouldBook", default_factory=list)
    faqs: list[PackageFaq] = Field(default_factory=list)
    fibrosis_scan_included: bool = Field(default=True, alias="fibrosisScanIncluded")
    pathology_included: bool = Field(default=False, alias="pathologyIncluded")
    consultation_included: bool = Field(default=False, alias="consultationIncluded")
    blood_collection_timing: BloodCollectionTiming | None = Field(default=None, alias="bloodCollectionTiming")
    visibility_web: bool = Field(default=True, alias="visibilityWeb")
    active: bool = True
    sort_order: int = Field(default=0, alias="sortOrder")
    terms_conditions: str | None = Field(default=None, alias="termsConditions")
    recommended_tag: bool = Field(default=False, alias="recommendedTag")
    test_count_total: int | None = Field(default=None, alias="testCountTotal")
    test_categories: list[PackageTestCategory] | None = Field(default=None, alias="testCategories")


class UpdatePackageInput(BaseSchema):
    code: str | None = None
    name: str | None = None
    subtitle: str | None = None
    description: str | None = None
    tagline: str | None = None
    price: float | None = None
    discount_price: float | None = Field(default=None, alias="discountPrice")
    includes: PackageIncludes | None = None
    checklist_sections: list[PackageChecklistSection] | None = Field(default=None, alias="checklistSections")
    highlights: list[PackageHighlight] | None = None
    preparation: list[str] | None = None
    who_should_book: list[str] | None = Field(default=None, alias="whoShouldBook")
    faqs: list[PackageFaq] | None = None
    fibrosis_scan_included: bool | None = Field(default=None, alias="fibrosisScanIncluded")
    pathology_included: bool | None = Field(default=None, alias="pathologyIncluded")
    consultation_included: bool | None = Field(default=None, alias="consultationIncluded")
    blood_collection_timing: BloodCollectionTiming | None = Field(default=None, alias="bloodCollectionTiming")
    visibility_web: bool | None = Field(default=None, alias="visibilityWeb")
    active: bool | None = None
    sort_order: int | None = Field(default=None, alias="sortOrder")
    terms_conditions: str | None = Field(default=None, alias="termsConditions")
    recommended_tag: bool | None = Field(default=None, alias="recommendedTag")
    test_count_total: int | None = Field(default=None, alias="testCountTotal")
    test_categories: list[PackageTestCategory] | None = Field(default=None, alias="testCategories")
