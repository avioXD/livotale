from datetime import date

import pytest

from app.core.exceptions import AppError
from app.services.profile_service import _parse_dob, _parse_gender, _serialize_value


def test_parse_dob_from_iso_string():
    assert _parse_dob("1990-01-15") == date(1990, 1, 15)


def test_parse_dob_none_for_empty():
    assert _parse_dob("") is None
    assert _parse_dob(None) is None


def test_parse_gender_valid_values():
    assert _parse_gender("male") == "male"
    assert _parse_gender("Female") == "female"


def test_parse_gender_rejects_invalid():
    with pytest.raises(AppError):
        _parse_gender("invalid")


def test_serialize_date():
    assert _serialize_value(date(1990, 1, 15)) == "1990-01-15"
