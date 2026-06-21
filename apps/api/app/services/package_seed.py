from __future__ import annotations

from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.package_content import create_includes_from_input
from app.models.commerce import LiverCarePackage

SEED_PACKAGES = [
    {
        "code": "PKG-1",
        "name": "Liver Fibrosis Scan",
        "subtitle": "Essential liver stiffness assessment at home",
        "tagline": "Know your liver health in one painless visit",
        "description": "Non-invasive liver stiffness measurement (LSM, CAP, F-stage) with a technician home visit and digital report.",
        "price": 5500,
        "discountPrice": None,
        "fibrosisScanIncluded": True,
        "pathologyIncluded": False,
        "consultationIncluded": False,
        "visibilityWeb": True,
        "active": True,
        "sortOrder": 1,
        "termsConditions": "Fasting 3 hours recommended. Results in 24–48 hours. Home visit within serviceable pin codes.",
        "recommendedTag": False,
        "preparation": [
            "Fast for 3 hours before the scan (water is allowed)",
            "Wear loose clothing for abdomen access",
        ],
        "whoShouldBook": ["Adults with fatty liver or metabolic concerns"],
        "faqs": [
            {
                "question": "Is the scan painful?",
                "answer": "No. Liver Fibrosis Scan is non-invasive — similar to an ultrasound with no needles.",
            }
        ],
    },
    {
        "code": "PKG-2",
        "name": "Liver Fibrosis Scan + Pathological Test",
        "subtitle": None,
        "tagline": None,
        "description": "Fibrosis scan with blood pathology panel.",
        "price": 8560,
        "discountPrice": None,
        "fibrosisScanIncluded": True,
        "pathologyIncluded": True,
        "consultationIncluded": False,
        "bloodCollectionTiming": "after_scan",
        "visibilityWeb": True,
        "active": True,
        "sortOrder": 2,
        "termsConditions": "Includes home blood sample collection. Combined report within 5–7 business days after lab processing.",
        "recommendedTag": False,
        "testCountTotal": None,
    },
    {
        "code": "PKG-3",
        "name": "LivoTale Executive",
        "subtitle": None,
        "tagline": None,
        "description": "Full liver care package with consultation and prescription.",
        "price": 9500,
        "discountPrice": None,
        "fibrosisScanIncluded": True,
        "pathologyIncluded": True,
        "consultationIncluded": True,
        "bloodCollectionTiming": "after_scan",
        "visibilityWeb": True,
        "active": True,
        "sortOrder": 3,
        "termsConditions": "Consultation scheduled after reports are ready.",
        "recommendedTag": True,
        "testCountTotal": None,
    },
]


async def sync_seed_packages(session: AsyncSession) -> int:
    seed_codes = [payload["code"] for payload in SEED_PACKAGES]
    await session.execute(
        delete(LiverCarePackage).where(LiverCarePackage.code.not_in(seed_codes))
    )

    for payload in SEED_PACKAGES:
        includes = create_includes_from_input(payload)
        package = (
            await session.execute(
                select(LiverCarePackage).where(LiverCarePackage.code == payload["code"])
            )
        ).scalar_one_or_none()
        if package is None:
            package = LiverCarePackage(code=payload["code"])
            session.add(package)

        package.name = payload["name"]
        package.description = payload["description"]
        package.price = Decimal(str(payload["price"]))
        package.discount_price = (
            Decimal(str(payload["discountPrice"])) if payload.get("discountPrice") else None
        )
        package.includes = includes
        package.fibrosis_scan_included = payload["fibrosisScanIncluded"]
        package.pathology_included = payload["pathologyIncluded"]
        package.consultation_included = payload["consultationIncluded"]
        package.visibility_web = payload["visibilityWeb"]
        package.active = payload["active"]
        package.sort_order = payload["sortOrder"]
        package.terms_conditions = payload.get("termsConditions")
        package.recommended_tag = payload.get("recommendedTag", False)
        package.deleted_at = None

    return len(SEED_PACKAGES)
