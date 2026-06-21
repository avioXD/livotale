from __future__ import annotations

from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.package_content import create_includes_from_input
from app.models.commerce import LiverCarePackage
from app.repositories.package_repo import PackageRepository

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
        "subtitle": "Scan plus comprehensive blood panel",
        "tagline": "Complete liver picture — imaging and lab together",
        "description": "Full liver assessment combining fibrosis scan with partner-lab pathology and a merged Livotale final report.",
        "price": 8000,
        "discountPrice": 7500,
        "fibrosisScanIncluded": True,
        "pathologyIncluded": True,
        "consultationIncluded": False,
        "bloodCollectionTiming": "after_scan",
        "visibilityWeb": True,
        "active": True,
        "sortOrder": 2,
        "termsConditions": "Includes home blood sample collection. Combined report within 5–7 business days after lab processing.",
        "recommendedTag": True,
        "testCountTotal": 56,
    },
    {
        "code": "PKG-3",
        "name": "Liver Fibrosis Scan + Pathological Test + Doctor Consultation",
        "subtitle": "Full care pathway with specialist review",
        "tagline": "Scan, labs, and expert guidance in one package",
        "description": "End-to-end liver care: home scan, pathology panel, merged report, specialist video consultation, and digital prescription.",
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
        "recommendedTag": False,
        "testCountTotal": 56,
    },
]


async def seed_packages_if_empty(session: AsyncSession) -> int:
    repo = PackageRepository(session)
    if await repo.count_all() > 0:
        return 0

    inserted = 0
    for payload in SEED_PACKAGES:
        includes = create_includes_from_input(payload)
        package = LiverCarePackage(
            code=payload["code"],
            name=payload["name"],
            description=payload["description"],
            price=Decimal(str(payload["price"])),
            discount_price=Decimal(str(payload["discountPrice"])) if payload.get("discountPrice") else None,
            includes=includes,
            fibrosis_scan_included=payload["fibrosisScanIncluded"],
            pathology_included=payload["pathologyIncluded"],
            consultation_included=payload["consultationIncluded"],
            visibility_web=payload["visibilityWeb"],
            active=payload["active"],
            sort_order=payload["sortOrder"],
            terms_conditions=payload.get("termsConditions"),
            recommended_tag=payload.get("recommendedTag", False),
        )
        await repo.add(package)
        inserted += 1
    return inserted
