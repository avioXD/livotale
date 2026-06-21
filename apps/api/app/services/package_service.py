from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.package_content import create_includes_from_input, decimal_or_none, package_to_dict
from app.models.commerce import LiverCarePackage
from app.repositories.package_repo import PackageRepository
from app.schemas.packages import CreatePackageInput, UpdatePackageInput


class PackageService:
    def __init__(self, session: AsyncSession):
        self.repo = PackageRepository(session)

    async def list_public(self) -> list[dict]:
        rows = await self.repo.list_public()
        return [package_to_dict(row) for row in rows]

    async def list_admin(self) -> list[dict]:
        rows = await self.repo.list_admin()
        return [package_to_dict(row) for row in rows]

    async def get_by_code(self, code: str) -> dict:
        row = await self.repo.get_by_code(code)
        if row is None or not row.active or not row.visibility_web:
            raise AppError("Package not found", status_code=404, error="not_found")
        return package_to_dict(row)

    async def get_by_id(self, package_id: UUID) -> dict:
        row = await self.repo.get_by_id(package_id)
        if row is None:
            raise AppError("Package not found", status_code=404, error="not_found")
        return package_to_dict(row)

    async def create(self, payload: CreatePackageInput, *, actor_id: UUID | None) -> dict:
        if await self.repo.code_exists(payload.code):
            raise AppError(f"Package code {payload.code} already exists", status_code=409, error="conflict")

        data = payload.model_dump(by_alias=True)
        includes = create_includes_from_input(data)
        package = LiverCarePackage(
            code=payload.code,
            name=payload.name,
            description=payload.description,
            price=Decimal(str(payload.price)),
            discount_price=decimal_or_none(payload.discount_price),
            includes=includes,
            fibrosis_scan_included=payload.fibrosis_scan_included,
            pathology_included=payload.pathology_included,
            consultation_included=payload.consultation_included,
            visibility_web=payload.visibility_web,
            active=payload.active,
            sort_order=payload.sort_order,
            terms_conditions=payload.terms_conditions,
            recommended_tag=payload.recommended_tag,
            created_by=actor_id,
            updated_by=actor_id,
        )
        saved = await self.repo.add(package)
        return package_to_dict(saved)

    async def update(self, package_id: UUID, payload: UpdatePackageInput, *, actor_id: UUID | None) -> dict:
        package = await self.repo.get_by_id(package_id)
        if package is None:
            raise AppError("Package not found", status_code=404, error="not_found")

        data = payload.model_dump(by_alias=True, exclude_unset=True)
        if "code" in data and data["code"] != package.code:
            if await self.repo.code_exists(data["code"], exclude_id=package_id):
                raise AppError(f"Package code {data['code']} already exists", status_code=409, error="conflict")
            package.code = data["code"]

        for field, attr in (
            ("name", "name"),
            ("description", "description"),
            ("fibrosisScanIncluded", "fibrosis_scan_included"),
            ("pathologyIncluded", "pathology_included"),
            ("consultationIncluded", "consultation_included"),
            ("visibilityWeb", "visibility_web"),
            ("active", "active"),
            ("sortOrder", "sort_order"),
            ("termsConditions", "terms_conditions"),
            ("recommendedTag", "recommended_tag"),
        ):
            if field in data:
                setattr(package, attr, data[field])

        if "price" in data:
            package.price = Decimal(str(data["price"]))
        if "discountPrice" in data:
            package.discount_price = decimal_or_none(data["discountPrice"])

        content_keys = {
            "subtitle",
            "tagline",
            "checklistSections",
            "highlights",
            "preparation",
            "whoShouldBook",
            "faqs",
            "bloodCollectionTiming",
            "testCountTotal",
            "testCategories",
        }
        if content_keys.intersection(data.keys()) or "includes" in data:
            merged = create_includes_from_input({**package_to_dict(package), **data})
            package.includes = merged

        package.updated_by = actor_id
        saved = await self.repo.save(package)
        return package_to_dict(saved)

    async def delete(self, package_id: UUID) -> None:
        package = await self.repo.get_by_id(package_id)
        if package is None:
            raise AppError("Package not found", status_code=404, error="not_found")
        from app.repositories.order_repo import OrderRepository

        if await OrderRepository(self.repo.session).package_referenced(package_id):
            raise AppError("Cannot delete — package is referenced by existing orders", status_code=409, error="conflict")
        await self.repo.soft_delete(package)
