from enum import StrEnum

from app.core.exceptions import AppError


class RoleCode(StrEnum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    TECHNICIAN = "technician"
    ADMIN = "admin"
    HEALTH_COACH = "health_coach"
    DIETICIAN = "dietician"
    PHARMACY = "pharmacy"
    LAB_PARTNER = "lab_partner"
    SUPPORT = "support"
    CITY_MANAGER = "city_manager"


ALL_ROLE_CODES: frozenset[str] = frozenset(RoleCode)

ROLE_LABELS: dict[RoleCode, str] = {
    RoleCode.PATIENT: "Patient",
    RoleCode.DOCTOR: "Doctor",
    RoleCode.TECHNICIAN: "Technician",
    RoleCode.ADMIN: "Admin",
    RoleCode.HEALTH_COACH: "Health Coach",
    RoleCode.DIETICIAN: "Dietician",
    RoleCode.PHARMACY: "Pharmacy",
    RoleCode.LAB_PARTNER: "Lab Partner",
    RoleCode.SUPPORT: "Operations Team",
    RoleCode.CITY_MANAGER: "City Manager",
}

ROLE_HIERARCHY: dict[RoleCode, int] = {
    RoleCode.PATIENT: 1,
    RoleCode.DIETICIAN: 2,
    RoleCode.HEALTH_COACH: 3,
    RoleCode.TECHNICIAN: 4,
    RoleCode.LAB_PARTNER: 5,
    RoleCode.PHARMACY: 6,
    RoleCode.DOCTOR: 7,
    RoleCode.SUPPORT: 8,
    RoleCode.CITY_MANAGER: 9,
    RoleCode.ADMIN: 10,
}

ROLE_PRIORITY: tuple[RoleCode, ...] = (
    RoleCode.ADMIN,
    RoleCode.CITY_MANAGER,
    RoleCode.SUPPORT,
    RoleCode.DOCTOR,
    RoleCode.PHARMACY,
    RoleCode.LAB_PARTNER,
    RoleCode.TECHNICIAN,
    RoleCode.HEALTH_COACH,
    RoleCode.DIETICIAN,
    RoleCode.PATIENT,
)

ADMIN_ROLES: frozenset[RoleCode] = frozenset({RoleCode.ADMIN, RoleCode.CITY_MANAGER})
OPS_ROLES: frozenset[RoleCode] = frozenset({RoleCode.SUPPORT, RoleCode.ADMIN, RoleCode.CITY_MANAGER})


def normalize_role_codes(codes: list[str]) -> list[RoleCode]:
    normalized: list[RoleCode] = []
    seen: set[RoleCode] = set()
    for raw in codes:
        try:
            role = RoleCode(raw)
        except ValueError:
            continue
        if role not in seen:
            seen.add(role)
            normalized.append(role)
    return normalized


def pick_primary_role(roles: list[RoleCode]) -> RoleCode:
    for candidate in ROLE_PRIORITY:
        if candidate in roles:
            return candidate
    return roles[0] if roles else RoleCode.PATIENT


def has_role(user_roles: list[str], allowed_roles: list[str] | tuple[str, ...]) -> bool:
    allowed = set(allowed_roles)
    return any(role in allowed for role in user_roles)


def has_minimum_role(user_roles: list[str], minimum_role: RoleCode | str) -> bool:
    minimum = RoleCode(minimum_role)
    minimum_level = ROLE_HIERARCHY[minimum]
    for role_code in user_roles:
        try:
            role = RoleCode(role_code)
        except ValueError:
            continue
        if ROLE_HIERARCHY[role] >= minimum_level:
            return True
    return False


def is_admin_role(user_roles: list[str]) -> bool:
    return has_role(user_roles, tuple(ADMIN_ROLES))


def is_ops_role(user_roles: list[str]) -> bool:
    return has_role(user_roles, tuple(OPS_ROLES))


def require_role(user_roles: list[str], *allowed_roles: str) -> None:
    """Raise AppError(403) when the user lacks any of the allowed roles."""
    if not allowed_roles:
        return
    if not has_role(user_roles, allowed_roles):
        joined = ", ".join(allowed_roles)
        raise AppError(f"Requires one of roles: {joined}", status_code=403, error="forbidden")
