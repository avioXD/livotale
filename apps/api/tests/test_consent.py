from uuid import uuid4

from app.services.consent_service import _serialize_consent


def test_serialize_consent_uses_camel_case():
    row = {
        "id": uuid4(),
        "purpose_id": uuid4(),
        "purpose_code": "CARE_DELIVERY",
        "purpose_name": "Care delivery",
        "purpose_description": "Process health data.",
        "accepted": True,
        "accepted_at": None,
        "withdrawn_at": None,
    }
    payload = _serialize_consent(row)
    assert payload["purposeId"] == row["purpose_id"]
    assert payload["purposeCode"] == "CARE_DELIVERY"
    assert payload["purposeDescription"] == "Process health data."
    assert payload["accepted"] is True
