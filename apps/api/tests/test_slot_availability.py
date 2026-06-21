"""Unit tests for slot availability generation."""

from datetime import time

from app.services.slot_availability_service import build_slot_defs, format_slot_label


def test_build_slot_defs_8_to_6_45_min():
    defs = build_slot_defs(time(8, 0), time(18, 0), 45)
    codes = [s.code for s in defs]
    assert codes[0] == "08:00"
    assert codes[-1] == "17:00"
    assert len(codes) == 13


def test_format_slot_label():
    assert format_slot_label(8, 0) == "8:00 AM – 8:45 AM"
    assert format_slot_label(17, 15) == "5:15 PM – 6:00 PM"
