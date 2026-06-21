from app.middleware.api_audit import _should_skip_audit


def test_should_skip_health_and_docs():
    assert _should_skip_audit("/health") is True
    assert _should_skip_audit("/docs") is True
    assert _should_skip_audit("/openapi.json") is True
    assert _should_skip_audit("/auth/login") is False
    assert _should_skip_audit("/api/v1/auth/logout") is False
