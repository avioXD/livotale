import re

_DIGITS = re.compile(r"\D+")


def normalize_phone(value: str) -> str:
    digits = _DIGITS.sub("", value or "")
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def phones_match(a: str, b: str) -> bool:
    na, nb = normalize_phone(a), normalize_phone(b)
    return bool(na) and na == nb


def to_twilio_e164(value: str) -> str:
    stripped = (value or "").strip()
    digits = _DIGITS.sub("", stripped)
    if stripped.startswith("+"):
        return f"+{digits}"
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) > 10:
        return f"+{digits}"
    raise ValueError(f"Invalid phone number: {value}")
