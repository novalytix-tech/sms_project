"""
Tests for the database-disconnected runtime (DATABASE_ENABLED=false) and the
development authentication mode. These run without any PostgreSQL server.
"""
import json
import re
import socket
import uuid

import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.utils.security import hash_password

TEMPLATE = "dev_auth_accounts.example.json"
PASSWORDS = {
    "superadmin@sms.edu.in": "SuperDev#Test1",
    "principal@stxaviers.edu.in": "AdminDev#Test1",
    "ananya.sharma@stxaviers.edu.in": "TeachDev#Test1",
    "vikram.patel@gmail.com": "ParentDev#Test1",
    "aarav.sharma@student.stxaviers.edu.in": "StudDev#Test1",
}

# Every (rule, method) pair registered before the database was disconnected.
EXPECTED_ROUTE_COUNT = 80


@pytest.fixture(scope="module")
def accounts_file(tmp_path_factory):
    import os
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    with open(os.path.join(backend_dir, TEMPLATE), encoding="utf-8") as fh:
        data = json.load(fh)
    for acc in data["accounts"]:
        pw = PASSWORDS.get(acc["email"])
        acc["password_hash"] = hash_password(pw) if pw else ""
    path = tmp_path_factory.mktemp("devauth") / "dev_auth_accounts.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return str(path)


@pytest.fixture(autouse=True)
def forbid_network(monkeypatch):
    """Any outbound socket connection (e.g. to PostgreSQL) fails the test."""
    def _blocked(*args, **kwargs):
        raise AssertionError(f"Unexpected network connection attempt: {args}")
    monkeypatch.setattr(socket.socket, "connect", _blocked)
    monkeypatch.setattr(socket, "create_connection", _blocked)


def make_app(accounts_file, **overrides):
    config = {
        "DATABASE_ENABLED": False,
        "SQLALCHEMY_DATABASE_URI": None,
        "DEV_AUTH_ENABLED": True,
        "DEV_AUTH_ACCOUNTS_FILE": accounts_file,
    }
    config.update(overrides)
    return create_app("testing", config_overrides=config)


@pytest.fixture
def app(accounts_file):
    return make_app(accounts_file)


@pytest.fixture
def client(app):
    return app.test_client()


def login(client, email):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORDS[email]})
    assert res.status_code == 200, res.get_json()
    return res


def bearer(client, email):
    token = login(client, email).get_json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# Startup & database disconnection
# ---------------------------------------------------------------------------

def test_app_starts_without_database_engine(app):
    assert app.config["DATABASE_ENABLED"] is False
    assert app.config["SQLALCHEMY_DATABASE_URI"] is None
    assert "sqlalchemy" not in app.extensions
    assert "migrate" not in app.extensions


def test_all_api_routes_still_registered(app):
    pairs = {
        (rule.rule, method)
        for rule in app.url_map.iter_rules()
        if rule.rule.startswith("/api/v1")
        for method in rule.methods - {"HEAD", "OPTIONS"}
    }
    assert len(pairs) == EXPECTED_ROUTE_COUNT
    for expected in [
        ("/api/v1/health", "GET"), ("/api/v1/auth/login", "POST"), ("/api/v1/sync/store", "GET"),
        ("/api/v1/students", "POST"), ("/api/v1/finance/invoices/<uuid:invoice_id>/pay", "POST"),
    ]:
        assert expected in pairs


def test_health_reports_database_disabled(client):
    res = client.get("/api/v1/health")
    body = res.get_json()
    assert res.status_code == 200
    assert body["success"] is True
    assert body["data"]["database"]["enabled"] is False
    assert body["data"]["database"]["status"] == "disabled"
    assert body["data"]["auth_mode"] == "development"


def _concrete_url(rule):
    return re.sub(r"<(?:[^:>]+:)?[^>]+>", str(uuid.uuid4()), rule)


def _db_routes(app):
    skip_prefixes = ("/api/v1/health", "/api/v1/auth/", "/api/v1/test/", "/api/v1/sync/", "/api/v1/students", "/api/v1/users")
    for rule in app.url_map.iter_rules():
        if not rule.rule.startswith("/api/v1") or rule.rule.startswith(skip_prefixes):
            continue
        for method in sorted(rule.methods - {"HEAD", "OPTIONS"}):
            yield method, rule.rule


def test_every_database_endpoint_returns_503(app, client):
    headers = bearer(client, "principal@stxaviers.edu.in")
    results = {}
    for method, rule in _db_routes(app):
        res = client.open(_concrete_url(rule), method=method, json={}, headers=headers)
        results[(method, rule)] = (res.status_code, (res.get_json() or {}).get("error", {}).get("code"))
    # Write endpoints may reject the empty payload during input validation before
    # touching the database; nothing may report success or crash.
    unexpected = {
        k: v for k, v in results.items()
        if v != (503, "DATABASE_UNAVAILABLE") and not (k[0] != "GET" and v[0] == 400)
    }
    assert not unexpected, unexpected
    assert all(v == (503, "DATABASE_UNAVAILABLE") for k, v in results.items() if k[0] == "GET")
    assert len(results) >= 45


def test_database_endpoints_return_503_without_token(client):
    for method, url in [("POST", "/api/v1/attendance/students/batch"),
                        ("GET", "/api/v1/finance/invoices"),
                        ("GET", "/api/v1/transport/routes")]:
        res = client.open(url, method=method, json={"students": []})
        assert res.status_code == 503
        assert res.get_json()["error"]["code"] == "DATABASE_UNAVAILABLE"
        assert res.get_json()["success"] is False


def test_fallback_sync_store_returns_200_when_db_disabled(client):
    res = client.get("/api/v1/sync/store")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["data"]["classes"]) >= 8
    assert len(data["data"]["students"]) >= 30


def test_database_enabled_without_url_fails_fast(accounts_file):
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        make_app(accounts_file, DATABASE_ENABLED=True, SQLALCHEMY_DATABASE_URI=None)


# ---------------------------------------------------------------------------
# Development authentication
# ---------------------------------------------------------------------------

def test_login_contract_and_refresh_cookie(client):
    res = login(client, "principal@stxaviers.edu.in")
    data = res.get_json()["data"]
    for key in ("user", "access_token", "token_type", "expires_in"):
        assert key in data
    assert "refresh_token" not in data
    assert data["user"]["roles"] == ["school_admin"]
    assert "finance:write" in data["user"]["permissions"]
    assert data["user"]["institution_id"]
    cookie = res.headers.get("Set-Cookie", "")
    assert "refresh_token_cookie=" in cookie and "HttpOnly" in cookie


@pytest.mark.parametrize("payload,status,code", [
    ({"email": "principal@stxaviers.edu.in", "password": "wrong-password"}, 401, "INVALID_CREDENTIALS"),
    ({"email": "nobody@example.com", "password": "AdminDev#Test1"}, 401, "INVALID_CREDENTIALS"),
    ({"email": "orders@apexsupplies.in", "password": ""}, 400, "CREDENTIALS_REQUIRED"),
    ({}, 400, "CREDENTIALS_REQUIRED"),
])
def test_login_rejects_bad_credentials(client, payload, status, code):
    res = client.post("/api/v1/auth/login", json=payload)
    assert res.status_code == status
    assert res.get_json()["error"]["code"] == code


def test_account_without_password_hash_cannot_log_in(client):
    # The supplier account is left without a hash in the test accounts file.
    res = client.post("/api/v1/auth/login", json={"email": "orders@apexsupplies.in", "password": "anything"})
    assert res.status_code == 401


def test_super_admin_has_no_institution(client):
    data = login(client, "superadmin@sms.edu.in").get_json()["data"]["user"]
    assert data["roles"] == ["super_admin"]
    assert data["institution_id"] is None


def test_me_returns_profile(client):
    res = client.get("/api/v1/auth/me", headers=bearer(client, "ananya.sharma@stxaviers.edu.in"))
    assert res.status_code == 200
    assert res.get_json()["data"]["email"] == "ananya.sharma@stxaviers.edu.in"
    assert res.get_json()["data"]["roles"] == ["teacher"]


@pytest.mark.parametrize("method,url,payload", [
    ("PUT", "/api/v1/auth/me", {"first_name": "X"}),
    ("POST", "/api/v1/auth/change-password", {"current_password": "a", "new_password": "b", "confirm_password": "b"}),
    ("POST", "/api/v1/auth/forgot-password", {"email": "principal@stxaviers.edu.in"}),
    ("POST", "/api/v1/auth/reset-password", {"token": "t", "new_password": "b", "confirm_password": "b"}),
])
def test_persistent_auth_operations_return_503(client, method, url, payload):
    headers = bearer(client, "principal@stxaviers.edu.in")
    res = client.open(url, method=method, json=payload, headers=headers)
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "DATABASE_UNAVAILABLE"


def test_protected_endpoint_requires_token(client):
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "AUTHORIZATION_REQUIRED"


def test_logout_revokes_access_token(client):
    headers = bearer(client, "vikram.patel@gmail.com")
    assert client.post("/api/v1/auth/logout", headers=headers).status_code == 200
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 401
    assert res.get_json()["error"]["code"] == "TOKEN_REVOKED"


def test_logout_all_revokes_existing_tokens(client):
    headers = bearer(client, "aarav.sharma@student.stxaviers.edu.in")
    assert client.post("/api/v1/auth/logout-all", headers=headers).status_code == 200
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_refresh_rotation_and_reuse_detection(app):
    client = app.test_client()
    res = login(client, "principal@stxaviers.edu.in")
    old_refresh = re.search(r"refresh_token_cookie=([^;]+)", res.headers["Set-Cookie"]).group(1)

    rotated = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert rotated.status_code == 200
    new_access = rotated.get_json()["data"]["access_token"]
    assert client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {new_access}"}).status_code == 200

    reused = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401
    assert reused.get_json()["error"]["code"] == "TOKEN_REUSE_DETECTED"


def test_token_not_issued_by_dev_auth_is_rejected(app, client):
    with app.app_context():
        forged = create_access_token(identity=str(uuid.uuid4()), additional_claims={
            "roles": ["super_admin"], "jti": str(uuid.uuid4()),
        })
    res = client.get("/api/v1/test/admin-only", headers={"Authorization": f"Bearer {forged}"})
    assert res.status_code == 401


# ---------------------------------------------------------------------------
# RBAC is enforced unchanged
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("email,admin_only,teacher_only,finance_write", [
    ("principal@stxaviers.edu.in", 200, 403, 200),
    ("ananya.sharma@stxaviers.edu.in", 403, 200, 403),
    ("vikram.patel@gmail.com", 403, 403, 403),
    ("aarav.sharma@student.stxaviers.edu.in", 403, 403, 403),
    ("superadmin@sms.edu.in", 200, 200, 200),
])
def test_role_and_permission_guards(client, email, admin_only, teacher_only, finance_write):
    headers = bearer(client, email)
    assert client.get("/api/v1/test/admin-only", headers=headers).status_code == admin_only
    assert client.get("/api/v1/test/teacher-only", headers=headers).status_code == teacher_only
    assert client.get("/api/v1/test/finance-write", headers=headers).status_code == finance_write


def test_rbac_routes_require_authentication(client):
    assert client.get("/api/v1/test/admin-only").status_code == 401


def test_relationship_guards_need_database(client):
    headers = bearer(client, "vikram.patel@gmail.com")
    res = client.get(f"/api/v1/test/parent-child/{uuid.uuid4()}", headers=headers)
    assert res.status_code == 503


# ---------------------------------------------------------------------------
# Mode switches
# ---------------------------------------------------------------------------

def test_login_unavailable_when_dev_auth_disabled(accounts_file):
    client = make_app(accounts_file, DEV_AUTH_ENABLED=False).test_client()
    res = client.post("/api/v1/auth/login", json={"email": "principal@stxaviers.edu.in", "password": "AdminDev#Test1"})
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert client.get("/api/v1/health").get_json()["data"]["auth_mode"] == "unavailable"


def test_dev_auth_refused_in_production(accounts_file):
    with pytest.raises(RuntimeError, match="production"):
        create_app("production", config_overrides={
            "DATABASE_ENABLED": False, "DEV_AUTH_ENABLED": True, "DEV_AUTH_ACCOUNTS_FILE": accounts_file,
        })


def test_missing_accounts_file_is_reported(tmp_path):
    client = make_app(str(tmp_path / "missing.json")).test_client()
    res = client.post("/api/v1/auth/login", json={"email": "a@b.c", "password": "x"})
    assert res.status_code == 503
    assert res.get_json()["error"]["code"] == "DEV_AUTH_NOT_CONFIGURED"


# ---------------------------------------------------------------------------
# CORS for the Vite dev server
# ---------------------------------------------------------------------------

def test_cors_allows_frontend_origin(client):
    res = client.options("/api/v1/auth/login", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    })
    assert res.headers.get("Access-Control-Allow-Origin") == "http://localhost:5173"
    assert res.headers.get("Access-Control-Allow-Credentials") == "true"


def test_cors_rejects_unknown_origin(client):
    res = client.get("/api/v1/health", headers={"Origin": "http://evil.example"})
    assert "Access-Control-Allow-Origin" not in res.headers
