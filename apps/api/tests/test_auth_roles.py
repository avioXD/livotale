from app.services.auth_service import _resolve_active_role


def test_resolve_active_role_single_role_auto_selects():
    active, requires = _resolve_active_role(["admin"], None)
    assert active == "admin"
    assert requires is False


def test_resolve_active_role_multiple_without_selection():
    active, requires = _resolve_active_role(["doctor", "support"], None)
    assert active is None
    assert requires is True


def test_resolve_active_role_multiple_with_valid_selection():
    active, requires = _resolve_active_role(["doctor", "support"], "doctor")
    assert active == "doctor"
    assert requires is False


def test_require_selected_role_rejects_unknown():
    from app.services.auth_service import _require_selected_role
    from app.core.exceptions import AppError
    import pytest

    with pytest.raises(AppError):
        _require_selected_role(["admin"], "doctor")
