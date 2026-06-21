"""S3 object key layout — category-first paths for browse/export."""

from uuid import UUID

from app.services.storage_service import S3_ENTITY_PREFIX, build_s3_object_key

ORDER_ID = UUID("11111111-1111-1111-1111-111111111111")
USER_ID = UUID("22222222-2222-2222-2222-222222222222")
FILE_ID = UUID("33333333-3333-3333-3333-333333333333")


def test_profile_key():
    key = build_s3_object_key("profile", USER_ID, FILE_ID, "avatar.jpg", root_prefix="livotale")
    assert key == f"livotale/identity/profiles/users/{USER_ID}/{FILE_ID}/avatar.jpg"


def test_collection_proof_with_photo_type_subfolder():
    key = build_s3_object_key(
        "collection_proof",
        ORDER_ID,
        FILE_ID,
        "tube.jpg",
        subfolder="order_id_label",
        root_prefix="livotale",
    )
    assert (
        key
        == f"livotale/operations/sample-collection/orders/{ORDER_ID}/order_id_label/{FILE_ID}/tube.jpg"
    )


def test_fibroscan_report_key():
    key = build_s3_object_key("fibroscan_report", ORDER_ID, FILE_ID, "scan.pdf", root_prefix="livotale")
    assert key == f"livotale/clinical/fibroscan/orders/{ORDER_ID}/{FILE_ID}/scan.pdf"


def test_staff_compliance_document_type_subfolder():
    key = build_s3_object_key(
        "staff_compliance",
        USER_ID,
        FILE_ID,
        "aadhaar.pdf",
        subfolder="aadhaar",
        root_prefix="livotale",
    )
    assert (
        key
        == f"livotale/operations/staff-compliance/profiles/{USER_ID}/aadhaar/{FILE_ID}/aadhaar.pdf"
    )


def test_unknown_entity_falls_back_to_misc():
    key = build_s3_object_key("unknown_type", ORDER_ID, FILE_ID, "file.bin", root_prefix="livotale")
    assert key == f"livotale/misc/uploads/{ORDER_ID}/{FILE_ID}/file.bin"


def test_all_mapped_entity_types_have_prefix():
    for entity_type in (
        "profile",
        "staff_compliance",
        "technician_compliance",
        "lab_report",
        "collection_proof",
        "fibroscan_report",
        "prescription",
        "final_report",
        "consent",
        "invoice",
        "signature",
        "chat_attachment",
        "old_report",
    ):
        assert entity_type in S3_ENTITY_PREFIX
