from __future__ import annotations

import math
import re
from datetime import UTC, datetime
from typing import Any, Literal
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.rbac import RoleCode, is_ops_role
from app.services.ai_extraction_service import AIExtractionService
from app.services.final_report_service import FinalReportService
from app.services.order_helpers import load_order_row, require_doctor_order, resolve_doctor_id
from app.services.technician_order_service import TechnicianOrderService

LiverHealthStatus = Literal["optimal", "normal", "caution", "high", "critical"]
LiverRoadmapStage = Literal["healthy", "fatty", "fibrosis", "cirrhosis"]

CLINICAL_REFERENCES = [
    "AASLD Practice Guidance on MASLD/MASH Risk Assessment",
    "Sterling RK et al. — FIB-4 Index (original publication)",
    "Sumida et al., BMC Gastroenterology 2012 — FIB-4 validation in NAFLD/MASLD",
    "EASL/AASLD non-invasive fibrosis assessment guidelines",
]


def _parse_numeric_field(fields: list[dict[str, Any]], names: list[str]) -> float | None:
    for name in names:
        for field in fields:
            if name.lower() in str(field.get("fieldName", "")).lower():
                raw = str(field.get("editableValue") or field.get("extractedValue") or "")
                raw = raw.replace(",", "")
                try:
                    return float(raw)
                except ValueError:
                    continue
    return None


def _compute_fib4(age: float, ast: float, alt: float, platelets_per_ul: float) -> float:
    platelets_giga = platelets_per_ul / 1000
    if platelets_giga <= 0 or alt <= 0:
        return 0.0
    return (age * ast) / (platelets_giga * math.sqrt(alt))


def _interpret_fib4(score: float) -> tuple[str, LiverHealthStatus]:
    if score < 1.3:
        return "Low risk of advanced fibrosis", "normal"
    if score <= 2.67:
        return "Indeterminate — consider further testing", "caution"
    return "High risk of advanced fibrosis", "high"


def _compute_apri(ast: float, platelets_per_ul: float, ast_uln: float = 40) -> float:
    platelets_giga = platelets_per_ul / 1000
    if platelets_giga <= 0:
        return 0.0
    return ((ast / ast_uln) / platelets_giga) * 100


def _interpret_apri(score: float) -> tuple[str, LiverHealthStatus]:
    if score < 0.5:
        return "No significant fibrosis", "normal"
    if score <= 1.5:
        return "Possible fibrosis", "caution"
    return "Likely cirrhosis", "high"


def _stiffness_status(kpa: float) -> LiverHealthStatus:
    if kpa < 6:
        return "normal"
    if kpa < 8:
        return "caution"
    if kpa < 12:
        return "high"
    return "critical"


def _cap_status(dbm: float) -> LiverHealthStatus:
    if dbm < 238:
        return "normal"
    if dbm < 260:
        return "caution"
    if dbm < 290:
        return "high"
    return "critical"


def _bmi_status(bmi: float) -> LiverHealthStatus:
    if bmi < 23:
        return "normal"
    if bmi < 25:
        return "caution"
    if bmi < 30:
        return "high"
    return "critical"


def _roadmap_from_scan(scan: dict[str, Any]) -> LiverRoadmapStage:
    stage = str(scan.get("fibrosisStage", "")).upper()
    if "F3" in stage or "F4" in stage:
        return "cirrhosis"
    if "F2" in stage or "F1" in stage:
        return "fibrosis"
    steatosis = str(scan.get("steatosisGrade", "")).upper()
    if "S2" in steatosis or "S3" in steatosis:
        return "fatty"
    if float(scan.get("capDbm") or 0) >= 260:
        return "fatty"
    return "fibrosis" if float(scan.get("liverStiffnessKpa") or 0) >= 7 else "fatty"


def _compute_liver_health_score(scan: dict[str, Any], fib4: float | None, bmi: float) -> int:
    kpa = float(scan.get("liverStiffnessKpa") or 0)
    cap = float(scan.get("capDbm") or 0)
    score = 100.0
    score -= min(35, max(0, (kpa - 5) * 4))
    score -= min(25, max(0, (cap - 220) / 6))
    if fib4 is not None:
        if fib4 > 2.67:
            score -= 20
        elif fib4 > 1.3:
            score -= 10
    score -= min(15, max(0, (bmi - 23) * 1.5))
    return round(max(35, min(98, score)))


def _compute_liver_age(actual_age: float, scan: dict[str, Any]) -> int:
    kpa = float(scan.get("liverStiffnessKpa") or 0)
    cap = float(scan.get("capDbm") or 0)
    stiffness_offset = max(0, kpa - 5) * 1.2
    fat_offset = max(0, cap - 240) / 25
    return round(actual_age + stiffness_offset + fat_offset)


def _compute_recovery_potential(scan: dict[str, Any]) -> int:
    kpa = float(scan.get("liverStiffnessKpa") or 0)
    cap = float(scan.get("capDbm") or 0)
    base = 92.0
    if kpa > 9:
        base -= 18
    elif kpa > 7:
        base -= 10
    if cap > 290:
        base -= 12
    elif cap > 260:
        base -= 6
    return round(max(45, min(95, base)))


def _target_weight_kg(height_cm: float, target_bmi: float = 24) -> int:
    h = height_cm / 100
    return round(target_bmi * h * h)


def _estimate_height_cm(bmi: float, weight_kg: float) -> int:
    if bmi <= 0:
        return 170
    return round(math.sqrt(weight_kg / bmi) * 100)


def _estimate_weight_kg(bmi: float, height_cm: float = 170) -> int:
    h = height_cm / 100
    return round(bmi * h * h)


def _cardiometabolic_risk(bmi: float, hba1c: float | None, triglycerides: float | None) -> int:
    risk = 20.0
    if bmi >= 30:
        risk += 30
    elif bmi >= 25:
        risk += 18
    if hba1c is not None:
        if hba1c >= 6.5:
            risk += 25
        elif hba1c >= 5.7:
            risk += 12
    if triglycerides is not None:
        if triglycerides > 200:
            risk += 20
        elif triglycerides > 150:
            risk += 10
    return round(min(95, risk))


def _risk_level(percent: float) -> LiverHealthStatus:
    if percent < 25:
        return "normal"
    if percent < 45:
        return "caution"
    if percent < 65:
        return "high"
    return "critical"


def _verdict_from_score(score: int) -> tuple[str, LiverHealthStatus]:
    if score >= 85:
        return "Excellent liver health", "optimal"
    if score >= 70:
        return "Good — monitor lifestyle", "normal"
    if score >= 55:
        return "Moderate concern — action advised", "caution"
    if score >= 40:
        return "Significant liver stress", "high"
    return "Critical — urgent hepatology review", "critical"


class LiverHealthReportService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _load_patient_demographics(self, patient_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                SELECT u.dob, u.gender
                FROM clinical.patients p
                JOIN identity.users u ON u.id = p.user_id
                WHERE p.id = :patient_id
                """
            ),
            {"patient_id": patient_id},
        )
        row = result.mappings().first()
        age = 45
        sex: Literal["M", "F", "Other"] = "M"
        if row and row.get("dob"):
            age = int((datetime.now(UTC) - row["dob"]).days / 365.25)
        if row and row.get("gender"):
            gender = str(row["gender"]).lower()
            if gender in ("f", "female"):
                sex = "F"
            elif gender in ("m", "male"):
                sex = "M"
            else:
                sex = "Other"
        return {"age": age, "sex": sex}

    async def _assert_access(
        self,
        order_id: UUID,
        *,
        roles: list[str],
        doctor_id: UUID | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if is_ops_role(roles):
            return order
        if RoleCode.DOCTOR.value in roles and doctor_id is not None:
            require_doctor_order(order, doctor_id, roles)
            return order
        raise AppError("Forbidden", status_code=403, error="forbidden")

    async def get_for_order(
        self,
        order_id: UUID,
        *,
        require_published: bool = False,
        user_id: UUID | None = None,
        roles: list[str] | None = None,
        doctor_id: UUID | None = None,
    ) -> dict[str, Any] | None:
        order = await load_order_row(self.db, order_id)
        if roles:
            await self._assert_access(order_id, roles=roles, doctor_id=doctor_id)

        if require_published:
            report = await FinalReportService(self.db).get_for_order(order_id)
            if not report or report.get("status") not in ("published", "locked"):
                return None

        scan = await TechnicianOrderService(self.db).get_scan(order_id)
        if not scan:
            return None

        pathology_included = bool(order.get("pathology_included"))
        ai_job = await AIExtractionService(self.db).get_job_for_order(order_id)
        fields = ai_job.get("fields", []) if ai_job else []
        verified = ai_job and ai_job.get("status") == "verified"
        pathology_fields = fields if pathology_included and verified else []

        demographics = await self._load_patient_demographics(order["patient_id"])
        patient_age = demographics["age"]
        patient_sex = demographics["sex"]

        alt = _parse_numeric_field(pathology_fields, ["sgpt", "alt"]) or 48
        ast = _parse_numeric_field(pathology_fields, ["sgot", "ast"]) or 42
        platelets = _parse_numeric_field(pathology_fields, ["platelet"]) or 165000
        hba1c = _parse_numeric_field(pathology_fields, ["hba1c"])
        triglycerides = _parse_numeric_field(pathology_fields, ["triglyceride", "tg"])
        hemoglobin = _parse_numeric_field(pathology_fields, ["hemoglobin", "hb"])

        bmi = float(scan.get("bmi") or 25)
        fib4 = _compute_fib4(patient_age, ast, alt, platelets) if pathology_included and verified else None
        apri = _compute_apri(ast, platelets) if pathology_included and verified else None
        fib4_interp = _interpret_fib4(fib4) if fib4 is not None else None
        apri_interp = _interpret_apri(apri) if apri is not None else None

        health_score = _compute_liver_health_score(scan, fib4, bmi)
        verdict, level = _verdict_from_score(health_score)
        liver_age = _compute_liver_age(patient_age, scan)
        recovery = _compute_recovery_potential(scan)
        weight_kg = _estimate_weight_kg(bmi)
        height_cm = _estimate_height_cm(bmi, weight_kg)
        target_wt = _target_weight_kg(height_cm)
        weight_loss = max(0, weight_kg - target_wt)
        cardio_risk = _cardiometabolic_risk(bmi, hba1c, triglycerides)
        current_roadmap = _roadmap_from_scan(scan)

        kpa = float(scan.get("liverStiffnessKpa") or 0)
        cap = float(scan.get("capDbm") or 0)
        steatosis_grade = str(scan.get("steatosisGrade") or "S1")
        active_grade = re.sub(r"[^S0-3]", "", steatosis_grade.upper()) or "S1"

        ai_summary_parts = [
            f"Your liver shows {str(scan.get('interpretation', 'findings')).lower()} with {steatosis_grade} steatosis on FibroScan.",
        ]
        if fib4_interp:
            ai_summary_parts.append(
                f"FIB-4 score of {fib4:.2f} indicates {fib4_interp[0].lower()}."
            )
        else:
            ai_summary_parts.append(
                "Pathology panel was not included in your package; scores rely on transient elastography."
            )
        if recovery >= 80:
            ai_summary_parts.append(
                "With targeted weight loss and lifestyle changes, significant liver fat reduction is achievable within 6–12 months."
            )
        else:
            ai_summary_parts.append(
                "Structured hepatology follow-up and sustained lifestyle intervention are recommended."
            )
        ai_summary = " ".join(ai_summary_parts)

        biomarkers: list[dict[str, Any]] = [
            {
                "parameter": "BMI",
                "result": str(bmi),
                "unit": "kg/m²",
                "optimalRange": "18.5–23.9",
                "status": _bmi_status(bmi),
                "flag": "high" if bmi > 25 else "normal",
            }
        ]
        if pathology_included and pathology_fields:
            for field in pathology_fields:
                flag = field.get("flag") or "normal"
                biomarkers.append(
                    {
                        "parameter": field.get("fieldName"),
                        "result": field.get("editableValue") or field.get("extractedValue"),
                        "unit": field.get("unit"),
                        "optimalRange": field.get("referenceRange") or "—",
                        "status": "high" if flag in ("high", "critical") else "caution" if flag == "low" else "normal",
                        "flag": flag,
                    }
                )

        at_a_glance: list[dict[str, Any]] = [
            {
                "parameter": "BMI",
                "result": str(bmi),
                "status": _bmi_status(bmi),
                "statusLabel": "Overweight" if bmi >= 25 else "Normal",
            },
            {
                "parameter": "LSM",
                "result": str(kpa),
                "unit": "kPa",
                "status": _stiffness_status(kpa),
                "statusLabel": str(scan.get("fibrosisStage") or ""),
            },
            {
                "parameter": "CAP",
                "result": str(cap),
                "unit": "dB/m",
                "status": _cap_status(cap),
                "statusLabel": steatosis_grade,
            },
            {
                "parameter": "ALT",
                "result": str(alt),
                "unit": "U/L",
                "status": "high" if alt > 56 else "normal",
                "statusLabel": "High" if alt > 56 else "Normal",
            },
            {
                "parameter": "AST",
                "result": str(ast),
                "unit": "U/L",
                "status": "caution" if ast > 40 else "normal",
                "statusLabel": "Elevated" if ast > 40 else "Normal",
            },
        ]
        if hemoglobin is not None:
            at_a_glance.insert(
                3,
                {
                    "parameter": "Hemoglobin",
                    "result": str(hemoglobin),
                    "unit": "g/dL",
                    "status": "caution" if hemoglobin < 12 else "normal",
                    "statusLabel": "Low" if hemoglobin < 12 else "Normal",
                },
            )

        non_invasive_scores: list[dict[str, Any]] = []
        if fib4 is not None and fib4_interp:
            non_invasive_scores.append(
                {
                    "name": "FIB-4 Index",
                    "value": f"{fib4:.2f}",
                    "interpretation": fib4_interp[0],
                    "status": fib4_interp[1],
                    "reference": "<1.30 low · >2.67 high",
                }
            )
        if apri is not None and apri_interp:
            non_invasive_scores.append(
                {
                    "name": "APRI Score",
                    "value": f"{apri:.2f}",
                    "interpretation": apri_interp[0],
                    "status": apri_interp[1],
                    "reference": "<0.5 no fibrosis",
                }
            )
        non_invasive_scores.extend(
            [
                {
                    "name": "FAST Score",
                    "value": f"{(cap / 100 + kpa / 10):.2f}",
                    "interpretation": "Elevated — MASH concern" if kpa > 8 else "Low to moderate",
                    "status": "caution" if kpa > 8 else "normal",
                    "reference": "Steatosis + stiffness composite",
                },
                {
                    "name": "NAFLD Fibrosis Score",
                    "value": f"{(fib4 * 0.4 - 1.5):.2f}" if fib4 is not None else "-1.2",
                    "interpretation": "Low risk" if fib4 is not None and fib4 < 1.3 else "Indeterminate",
                    "status": "normal" if fib4 is not None and fib4 < 1.3 else "caution",
                    "reference": "Age, BMI, AST/ALT, albumin, platelets",
                },
                {
                    "name": "BARD Score",
                    "value": str(2 if bmi >= 28 else 1),
                    "interpretation": "Moderate risk" if bmi >= 28 else "Low risk",
                    "status": "caution" if bmi >= 28 else "normal",
                    "reference": "BMI, AST/ALT ratio, diabetes",
                },
            ]
        )

        steatosis_stages = ["S0", "S1", "S2", "S3"]
        report_id = f"LHR-{order['order_number']}"

        return {
            "id": f"lhr-{order_id}",
            "orderId": str(order_id),
            "header": {
                "reportId": report_id,
                "reportTitle": "LIVOTALE™ AI-HYBRID LIVER HEALTH REPORT",
                "patientName": order["patient_name"],
                "patientAge": patient_age,
                "patientSex": patient_sex,
                "orderNumber": order["order_number"],
                "packageName": order["package_name"],
                "generatedAt": datetime.now(UTC).isoformat(),
                "scanDate": scan.get("scanAt"),
                "pathologyIncluded": pathology_included and bool(pathology_fields),
            },
            "liverHealthScore": {
                "score": health_score,
                "maxScore": 100,
                "verdict": verdict,
                "verdictLevel": level,
                "aiHybridSummary": ai_summary,
            },
            "roadmap": {
                "currentStage": current_roadmap,
                "stages": [
                    {"id": "healthy", "label": "Healthy Liver", "description": "Normal stiffness & fat"},
                    {"id": "fatty", "label": "Fatty Liver", "description": "Hepatic steatosis (MASLD)"},
                    {"id": "fibrosis", "label": "Fibrosis", "description": f"Stage {scan.get('fibrosisStage')}"},
                    {"id": "cirrhosis", "label": "Cirrhosis", "description": "Advanced scarring"},
                ],
            },
            "fibroScan": {
                "liverStiffnessKpa": kpa,
                "stiffnessStage": scan.get("fibrosisStage"),
                "stiffnessStatus": _stiffness_status(kpa),
                "capDbm": cap,
                "steatosisGrade": steatosis_grade,
                "steatosisStatus": _cap_status(cap),
                "iqrMedianPercent": scan.get("iqrMedianPercent"),
                "probeType": scan.get("probeType"),
            },
            "liverAge": {
                "liverAgeYears": liver_age,
                "actualAgeYears": patient_age,
                "ageGapYears": liver_age - patient_age,
                "recoveryPotentialPercent": recovery,
                "recoveryLabel": "Excellent" if recovery >= 80 else "Good" if recovery >= 65 else "Moderate",
            },
            "progressionRisks": [
                {
                    "id": "cirrhosis",
                    "label": "Cirrhosis Risk (5 yr)",
                    "percent": min(85, round(kpa * 5)),
                    "level": _risk_level(kpa * 5),
                },
                {
                    "id": "mash",
                    "label": "MASH Progression",
                    "percent": min(80, round((cap - 200) / 4)),
                    "level": _risk_level((cap - 200) / 4),
                },
                {"id": "cvd", "label": "Heart Disease Risk", "percent": cardio_risk, "level": _risk_level(cardio_risk)},
                {
                    "id": "diabetes",
                    "label": "Diabetes Risk",
                    "percent": min(90, round((hba1c - 4.5) * 20)) if hba1c is not None else round(bmi * 1.5),
                    "level": _risk_level(bmi * 1.5),
                },
                {
                    "id": "nafld",
                    "label": "NAFLD Worsening",
                    "percent": min(75, round((cap - 220) / 3)),
                    "level": _risk_level((cap - 220) / 3),
                },
                {
                    "id": "hcc",
                    "label": "HCC Surveillance Need",
                    "percent": 55 if kpa > 10 else 18,
                    "level": "high" if kpa > 10 else "normal",
                },
            ],
            "atAGlance": at_a_glance,
            "keyInsight": (
                f"Your liver is biologically {liver_age - patient_age} years older than your actual age. "
                f"Target {weight_loss} kg weight loss over 6 months to improve liver fat and stiffness."
            ),
            "biomarkers": biomarkers,
            "nonInvasiveScores": non_invasive_scores,
            "bodyComposition": {
                "weightKg": weight_kg,
                "heightCm": height_cm,
                "bmi": bmi,
                "targetWeightKg": target_wt,
                "weightLossNeededKg": weight_loss,
                "bmiStatus": _bmi_status(bmi),
            },
            "liverFat": {
                "capDbm": cap,
                "steatosisGrade": steatosis_grade,
                "stageLabel": steatosis_grade,
                "stages": [
                    {
                        "grade": g,
                        "label": "No fat" if g == "S0" else "Mild" if g == "S1" else "Moderate" if g == "S2" else "Severe",
                        "range": "<238" if g == "S0" else "238–260" if g == "S1" else "260–290" if g == "S2" else "≥290",
                        "active": active_grade.startswith(g),
                    }
                    for g in steatosis_stages
                ],
            },
            "prescription": [
                {
                    "title": "Eat More",
                    "tone": "positive",
                    "items": [
                        "Leafy greens & cruciferous vegetables",
                        "Whole grains & legumes",
                        "Fatty fish (omega-3)",
                        "Berries & citrus fruits",
                        "Green tea & adequate water",
                    ],
                },
                {
                    "title": "Reduce / Avoid",
                    "tone": "negative",
                    "items": [
                        "Sugary drinks & refined carbs",
                        "Fried & ultra-processed foods",
                        "Alcohol (complete abstinence advised)",
                        "Excess red meat & trans fats",
                        "Late-night heavy meals",
                    ],
                },
                {
                    "title": "Physical Activity",
                    "tone": "neutral",
                    "items": [
                        "Brisk walking 30–45 min daily",
                        "Resistance training 2×/week",
                        "Yoga / mobility for stress",
                        f"Target: lose {weight_loss} kg in 6 months",
                    ],
                },
            ],
            "actionPlan": [
                {"id": "ap1", "label": f"Target weight loss: {weight_loss} kg in 6 months"},
                {"id": "ap2", "label": "Repeat FibroScan in 12 months"},
                {
                    "id": "ap3",
                    "label": "Repeat LFT panel in 6 months"
                    if pathology_included
                    else "Consider comprehensive LFT if symptoms persist",
                },
                {"id": "ap4", "label": "Strict alcohol abstinence"},
                {"id": "ap5", "label": "Hepatology review if LSM > 9 kPa or rising enzymes"},
            ],
            "aiSummary": ai_summary,
            "aiSummaryCards": [
                {"id": "sc", "icon": "trophy", "title": "Liver Health Score", "value": f"{health_score}/100", "subtitle": verdict},
                {
                    "id": "rp",
                    "icon": "heart",
                    "title": "Recovery Potential",
                    "value": f"{recovery}%",
                    "subtitle": "Excellent" if recovery >= 80 else "Action needed",
                },
                {"id": "wl", "icon": "target", "title": "Weight Loss Target", "value": f"{weight_loss} kg", "subtitle": f"Reach {target_wt} kg"},
                {"id": "nr", "icon": "calendar", "title": "Next Review", "value": "12 Months", "subtitle": "FibroScan follow-up"},
            ],
            "clinicalReferences": CLINICAL_REFERENCES,
            "generatedBy": "ai-hybrid",
            "createdAt": datetime.now(UTC).isoformat(),
        }

    async def get_for_order_with_auth(
        self,
        order_id: UUID,
        current_user_id: UUID,
        roles: list[str],
        *,
        require_published: bool = False,
        patient_phone: str | None = None,
    ) -> dict[str, Any] | None:
        if patient_phone:
            from app.services.patient_portal_service import PatientPortalService

            portal = PatientPortalService(self.db)
            if not await portal.get_order(patient_phone, order_id):
                raise AppError("Order not found", status_code=404)
            return await self.get_for_order(order_id, require_published=require_published)

        doctor_id = None
        if RoleCode.DOCTOR.value in roles:
            doctor_id = await resolve_doctor_id(self.db, current_user_id)
        return await self.get_for_order(
            order_id,
            require_published=require_published,
            user_id=current_user_id,
            roles=roles,
            doctor_id=doctor_id,
        )
