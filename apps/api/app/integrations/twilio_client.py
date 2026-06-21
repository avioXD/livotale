from __future__ import annotations

from typing import Any

from app.core.exceptions import AppError


def build_twilio_client(creds: dict[str, str]) -> Any:
    from twilio.rest import Client

    account_sid = creds["account_sid"]
    secret = creds["auth_token"]

    if account_sid.startswith("SK"):
        parent_account_sid = creds.get("parent_account_sid")
        if not parent_account_sid:
            raise AppError(
                "Twilio API Key auth requires your Account SID (starts with AC) in the Parent Account SID field",
                status_code=503,
                error="not_configured",
            )
        return Client(account_sid, secret, parent_account_sid)

    return Client(account_sid, secret)


def twilio_account_sid_for_api(creds: dict[str, str]) -> str:
    if creds["account_sid"].startswith("SK"):
        parent = creds.get("parent_account_sid")
        if not parent:
            raise AppError(
                "Twilio API Key auth requires your Account SID (starts with AC) in the Parent Account SID field",
                status_code=503,
                error="not_configured",
            )
        return parent
    return creds["account_sid"]
