from __future__ import annotations

from decimal import Decimal
from typing import Any

from app.models.commerce import LiverCarePackage

SECTION_SCAN = "cs-scan"
SECTION_PATHOLOGY = "cs-pathology"
SECTION_CONSULT = "cs-consult"

FIXED_CHECKLIST_SECTION_DEFS = [
    {
        "id": SECTION_SCAN,
        "title": "Fibrosis scan & imaging",
        "flag": "fibrosisScanIncluded",
        "items": [
            {"id": "ci-scan-lsm", "label": "Liver Fibrosis Scan (LSM, CAP, F-stage)"},
            {"id": "ci-scan-visit", "label": "Technician home visit"},
            {"id": "ci-scan-report", "label": "Scan interpretation in final report"},
        ],
    },
    {
        "id": SECTION_PATHOLOGY,
        "title": "Blood tests & pathology",
        "flag": "pathologyIncluded",
        "items": [
            {"id": "ci-path-lft", "label": "Liver function panel (SGOT, SGPT, bilirubin)"},
            {"id": "ci-path-cbc", "label": "Complete blood count"},
            {"id": "ci-path-viral", "label": "Viral markers (HBsAg, Anti-HCV)"},
            {"id": "ci-path-lab", "label": "Lab partner processing"},
            {"id": "ci-path-ai", "label": "Combined scan & pathology report"},
        ],
    },
    {
        "id": SECTION_CONSULT,
        "title": "Doctor consultation",
        "flag": "consultationIncluded",
        "items": [
            {"id": "ci-consult-video", "label": "Specialist video consultation"},
            {"id": "ci-consult-review", "label": "Review of scan + pathology"},
            {"id": "ci-consult-rx", "label": "Digital prescription"},
        ],
    },
]


def _flags(pkg: LiverCarePackage) -> dict[str, bool]:
    return {
        "fibrosisScanIncluded": bool(pkg.fibrosis_scan_included),
        "pathologyIncluded": bool(pkg.pathology_included),
        "consultationIncluded": bool(pkg.consultation_included),
    }


def default_checklist_sections(flags: dict[str, bool]) -> list[dict[str, Any]]:
    sections: list[dict[str, Any]] = []
    for section in FIXED_CHECKLIST_SECTION_DEFS:
        included = bool(flags.get(section["flag"]))
        sections.append(
            {
                "id": section["id"],
                "title": section["title"],
                "items": [
                    {"id": item["id"], "label": item["label"], "included": included, "detail": None}
                    for item in section["items"]
                ],
            }
        )
    return sections


def default_highlights(flags: dict[str, bool]) -> list[dict[str, str]]:
    highlights = [
        {"label": "Visit type", "value": "Home visit"},
        {"label": "Report TAT", "value": "24–48 hours" if not flags.get("pathologyIncluded") else "5–7 business days"},
    ]
    if flags.get("pathologyIncluded"):
        highlights.append({"label": "Fasting", "value": "8–10 hours before blood draw"})
    if flags.get("consultationIncluded"):
        highlights.append({"label": "Consultation", "value": "Video call after reports"})
    return highlights


def bullets_from_sections(sections: list[dict[str, Any]]) -> list[str]:
    bullets: list[str] = []
    for section in sections:
        for item in section.get("items", []):
            if item.get("included"):
                bullets.append(str(item.get("label", "")))
    return [b for b in bullets if b]


def merge_includes_payload(
    includes: dict[str, Any] | None,
    *,
    checklist_sections: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    payload = dict(includes or {})
    if checklist_sections is not None:
        payload["checklistSections"] = checklist_sections
        payload["bullets"] = bullets_from_sections(checklist_sections)
    return payload


def package_to_dict(pkg: LiverCarePackage) -> dict[str, Any]:
    includes = dict(pkg.includes or {})
    flags = _flags(pkg)
    checklist_sections = includes.get("checklistSections") or default_checklist_sections(flags)
    highlights = includes.get("highlights") or default_highlights(flags)
    bullets = includes.get("bullets") or bullets_from_sections(checklist_sections)

    return {
        "id": str(pkg.id),
        "code": pkg.code,
        "name": pkg.name,
        "subtitle": includes.get("subtitle"),
        "description": pkg.description or "",
        "tagline": includes.get("tagline"),
        "price": float(pkg.price),
        "discountPrice": float(pkg.discount_price) if pkg.discount_price is not None else None,
        "includes": {"bullets": bullets},
        "checklistSections": checklist_sections,
        "highlights": highlights,
        "preparation": includes.get("preparation") or [],
        "whoShouldBook": includes.get("whoShouldBook") or [],
        "faqs": includes.get("faqs") or [],
        "fibrosisScanIncluded": flags["fibrosisScanIncluded"],
        "pathologyIncluded": flags["pathologyIncluded"],
        "consultationIncluded": flags["consultationIncluded"],
        "bloodCollectionTiming": includes.get("bloodCollectionTiming"),
        "visibilityWeb": bool(pkg.visibility_web),
        "active": bool(pkg.active),
        "sortOrder": int(pkg.sort_order),
        "termsConditions": pkg.terms_conditions,
        "recommendedTag": bool(pkg.recommended_tag),
        "testCountTotal": includes.get("testCountTotal"),
        "testCategories": includes.get("testCategories"),
        "createdAt": pkg.created_at,
        "updatedAt": pkg.updated_at,
    }


def create_includes_from_input(data: dict[str, Any]) -> dict[str, Any]:
    flags = {
        "fibrosisScanIncluded": data.get("fibrosisScanIncluded", data.get("fibrosis_scan_included", True)),
        "pathologyIncluded": data.get("pathologyIncluded", data.get("pathology_included", False)),
        "consultationIncluded": data.get("consultationIncluded", data.get("consultation_included", False)),
    }
    checklist = data.get("checklistSections") or default_checklist_sections(flags)
    return merge_includes_payload(
        {
            "subtitle": data.get("subtitle"),
            "tagline": data.get("tagline"),
            "checklistSections": checklist,
            "highlights": data.get("highlights") or default_highlights(flags),
            "preparation": data.get("preparation") or [],
            "whoShouldBook": data.get("whoShouldBook") or [],
            "faqs": data.get("faqs") or [],
            "bloodCollectionTiming": data.get("bloodCollectionTiming"),
            "testCountTotal": data.get("testCountTotal"),
            "testCategories": data.get("testCategories"),
            "bullets": bullets_from_sections(checklist),
        }
    )


def decimal_or_none(value: float | int | Decimal | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))
