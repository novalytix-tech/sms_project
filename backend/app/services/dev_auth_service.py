"""
Database-free development/test authentication.

Active only when DEV_AUTH_ENABLED=true and DATABASE_ENABLED=false; create_app()
refuses to start the production config with DEV_AUTH_ENABLED set. Accounts are read
from a local JSON file holding Argon2id password hashes (see
dev_auth_accounts.example.json and scripts/create_dev_auth_accounts.py), so no
passwords live in code. Token revocations are held in process memory and are lost
when the server restarts.
"""
import json
import os
import re
import threading
import time
import uuid
from typing import Optional, Dict, Any, Tuple
from flask import current_app
from flask_jwt_extended import create_access_token, create_refresh_token
from app.utils.errors import APIException, DatabaseUnavailableError
from app.utils.security import verify_password, hash_password, validate_password_policy

KNOWN_ROLES = {"super_admin", "school_admin", "teacher", "student", "parent", "supplier"}

# Mirrors the role -> permission mapping created by seed.py (only school_admin
# holds granular permissions; super_admin bypasses checks in the decorators).
ROLE_PERMISSIONS = {
    "school_admin": [
        "academics:manage", "admissions:manage", "attendance:record",
        "finance:read", "finance:write", "library:circulate", "reports:view",
    ],
}

_lock = threading.Lock()
_accounts_cache: Dict[str, Any] = {"path": None, "mtime": None, "data": None}
_revoked_jtis: Dict[str, float] = {}           # jti -> expiry (epoch seconds)
_issued_jtis: Dict[str, Dict[str, float]] = {}  # user id -> {jti: expiry} for logout-all


DEV_ALIAS_MAP = {
    "superadmin@schoolerp.com": "superadmin@sms.edu.in",
    "vendor@apexsupplies.com": "orders@apexsupplies.in",
    "orders@apexsupplies.in": "orders@apexsupplies.in",
    "parent@stxaviers.edu.in": "vikram.patel@gmail.com",
    "rajesh.sharma@parent.stxaviers.edu.in": "vikram.patel@gmail.com",
}


def is_dev_auth_active() -> bool:
    """True when the database-free development authentication mode is in effect."""
    cfg = current_app.config
    return bool(cfg.get("DEV_AUTH_ENABLED")) and not cfg.get("DATABASE_ENABLED")


def _load_accounts() -> Dict[str, Any]:
    path = current_app.config.get("DEV_AUTH_ACCOUNTS_FILE")
    if not path or not os.path.isfile(path):
        raise APIException(
            message="Development authentication is enabled but its accounts file is missing. "
                    "Run scripts/create_dev_auth_accounts.py to create it.",
            status_code=503,
            error_code="DEV_AUTH_NOT_CONFIGURED",
        )

    mtime = os.path.getmtime(path)
    with _lock:
        if _accounts_cache["path"] == path and _accounts_cache["mtime"] == mtime:
            return _accounts_cache["data"]

    with open(path, "r", encoding="utf-8") as fh:
        raw = json.load(fh)

    institution = raw.get("institution") or None
    accounts = {}
    for acc in raw.get("accounts", []):
        roles = [r for r in acc.get("roles", []) if r in KNOWN_ROLES]
        if not acc.get("email") or not acc.get("id") or not roles:
            continue
        acc = dict(acc, roles=roles, email=acc["email"].strip().lower())
        accounts[acc["id"]] = acc

    data = {"institution": institution, "accounts": accounts}
    with _lock:
        _accounts_cache.update(path=path, mtime=mtime, data=data)
    return data


def _permissions_for(roles) -> list:
    perms = set()
    for role in roles:
        perms.update(ROLE_PERMISSIONS.get(role, []))
    return sorted(perms)


def _institution_for(account: Dict[str, Any], institution: Optional[Dict[str, Any]]):
    # Global super_admin is not bound to an institution, matching the seeded data.
    if "super_admin" in account["roles"] or not institution:
        return None
    return institution


def _full_name(account: Dict[str, Any]) -> str:
    return f"{account.get('first_name', '')} {account.get('last_name', '')}".strip()


def _issue_tokens(account: Dict[str, Any], institution: Optional[Dict[str, Any]]) -> Tuple[str, str]:
    inst = _institution_for(account, institution)
    inst_id_str = inst["id"] if inst else None
    access_jti, refresh_jti = str(uuid.uuid4()), str(uuid.uuid4())
    access_token = create_access_token(
        identity=account["id"],
        additional_claims={
            "institution_id": inst_id_str,
            "roles": account["roles"],
            "permissions": _permissions_for(account["roles"]),
            "username": account.get("username"),
            "email": account["email"],
            "full_name": _full_name(account),
            "type": "access",
            "jti": access_jti,
            "auth_mode": "development",
        },
    )
    refresh_token = create_refresh_token(
        identity=account["id"],
        additional_claims={
            "type": "refresh",
            "jti": refresh_jti,
            "institution_id": inst_id_str,
            "auth_mode": "development",
        },
    )

    now = time.time()
    cfg = current_app.config
    with _lock:
        issued = _issued_jtis.setdefault(account["id"], {})
        for stale in [k for k, v in issued.items() if v < now]:
            del issued[stale]
        issued[access_jti] = now + cfg["JWT_ACCESS_TOKEN_EXPIRES"].total_seconds()
        issued[refresh_jti] = now + cfg["JWT_REFRESH_TOKEN_EXPIRES"].total_seconds()
    return access_token, refresh_token


def _revoke_jti(jti: Optional[str], exp: Optional[float]) -> None:
    if not jti:
        return
    now = time.time()
    with _lock:
        for stale in [k for k, v in _revoked_jtis.items() if v < now]:
            del _revoked_jtis[stale]
        _revoked_jtis[jti] = exp or (now + 7 * 86400)


class DevAuthService:
    """Development counterpart of AuthService with the same call signatures."""

    @staticmethod
    def get_user(user_id) -> Optional[Dict[str, Any]]:
        return _load_accounts()["accounts"].get(str(user_id))

    @staticmethod
    def is_token_revoked(jwt_payload: dict) -> bool:
        jti = jwt_payload.get("jti")
        if not jti:
            return True
        with _lock:
            return jti in _revoked_jtis

    @staticmethod
    def authenticate_user(
        email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        if not email or not password:
            raise APIException(
                message="Email and password are required.",
                status_code=400,
                error_code="CREDENTIALS_REQUIRED"
            )

        data = _load_accounts()
        identifier = email.strip().lower()
        resolved_identifier = DEV_ALIAS_MAP.get(identifier, identifier)
        digits = re.sub(r"[^\d]", "", identifier)

        account = next(
            (a for a in data["accounts"].values()
             if a["email"] in (identifier, resolved_identifier) or
                (a.get("username") or "").lower() in (identifier, resolved_identifier) or
                (len(digits) >= 7 and re.sub(r"[^\d]", "", a.get("phone") or "")[-10:] == digits[-10:])),
            None,
        )

        generic_error = "Invalid email, username, or password."
        if not account or not account.get("password_hash") or not verify_password(password, account["password_hash"]):
            raise APIException(message=generic_error, status_code=401, error_code="INVALID_CREDENTIALS")

        if account.get("is_active") is False:
            raise APIException(
                message="This account has been deactivated. Please contact school administration.",
                status_code=403,
                error_code="ACCOUNT_INACTIVE"
            )

        access_token, refresh_token = _issue_tokens(account, data["institution"])
        current_app.logger.info(
            "DEV AUTH login: %s (%s) from %s", account["email"], ",".join(account["roles"]), ip_address
        )

        inst = _institution_for(account, data["institution"])
        return {
            "user": {
                "id": account["id"],
                "username": account.get("username"),
                "email": account["email"],
                "first_name": account.get("first_name"),
                "last_name": account.get("last_name"),
                "full_name": _full_name(account),
                "phone": account.get("phone"),
                "avatar_url": account.get("avatar_url"),
                "roles": account["roles"],
                "permissions": _permissions_for(account["roles"]),
                "institution_id": inst["id"] if inst else None,
                "institution": inst,
                "is_active": account.get("is_active", True),
                "is_verified": account.get("is_verified", True),
                "must_change_password": account.get("must_change_password", False),
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "Bearer",
            "expires_in": 900,  # 15 minutes
            "auth_mode": "development",
        }

    @staticmethod
    def rotate_refresh_token(
        refresh_payload: Dict[str, Any],
        ip_address: Optional[str] = None
    ) -> Tuple[str, str]:
        old_jti = refresh_payload.get("jti")
        user_id_str = refresh_payload.get("sub")
        if not old_jti or not user_id_str:
            raise APIException(
                message="Malformed refresh token claims.",
                status_code=401,
                error_code="INVALID_REFRESH_TOKEN"
            )

        if DevAuthService.is_token_revoked(refresh_payload):
            # Token reuse: invalidate every session for this user, as AuthService does.
            DevAuthService.logout_all_sessions(user_id_str)
            raise APIException(
                message="Security alert: Token reuse detected. All active sessions have been terminated.",
                status_code=401,
                error_code="TOKEN_REUSE_DETECTED"
            )

        data = _load_accounts()
        account = data["accounts"].get(user_id_str)
        if not account or account.get("is_active") is False:
            raise APIException(
                message="User account is inactive or no longer exists.",
                status_code=401,
                error_code="USER_NOT_FOUND"
            )

        _revoke_jti(old_jti, refresh_payload.get("exp"))
        return _issue_tokens(account, data["institution"])

    @staticmethod
    def logout_current_session(
        access_payload: Optional[Dict[str, Any]] = None,
        refresh_payload: Optional[Dict[str, Any]] = None,
        user_id=None
    ) -> None:
        for payload in (access_payload, refresh_payload):
            if payload:
                _revoke_jti(payload.get("jti"), payload.get("exp"))

    @staticmethod
    def logout_all_sessions(user_id) -> None:
        # Every development token is issued here, so revoke the exact set of JTIs
        # (no clock-granularity edge cases for a fresh login right afterwards).
        with _lock:
            issued = _issued_jtis.pop(str(user_id), {})
        for jti, exp in issued.items():
            _revoke_jti(jti, exp)

    @staticmethod
    def get_profile(user_id) -> Optional[Dict[str, Any]]:
        data = _load_accounts()
        account = data["accounts"].get(str(user_id))
        if not account:
            return None
        inst = _institution_for(account, data["institution"])
        return {
            "id": account["id"],
            "username": account.get("username"),
            "email": account["email"],
            "first_name": account.get("first_name"),
            "last_name": account.get("last_name"),
            "full_name": _full_name(account),
            "phone": account.get("phone"),
            "avatar_url": account.get("avatar_url"),
            "roles": account["roles"],
            "permissions": _permissions_for(account["roles"]),
            "institution_id": inst["id"] if inst else None,
            "institution": inst,
            "is_active": True,
            "is_verified": True,
            "last_login_at": None,
            "references": {},
            "auth_mode": "development",
        }

    @staticmethod
    def find_user_by_identifier(identifier: str) -> Optional[Dict[str, Any]]:
        if not identifier:
            return None
        clean_id = identifier.strip().lower()
        resolved = DEV_ALIAS_MAP.get(clean_id, clean_id)
        digits = re.sub(r"[^\d]", "", clean_id)
        data = _load_accounts()
        return next(
            (a for a in data["accounts"].values()
             if a["email"] in (clean_id, resolved) or
                (a.get("username") or "").lower() in (clean_id, resolved) or
                (len(digits) >= 7 and re.sub(r"[^\d]", "", a.get("phone") or "")[-10:] == digits[-10:])),
            None,
        )

    @staticmethod
    def update_user_password(user_id, new_password: str, must_change_password: bool = False) -> bool:
        path = current_app.config.get("DEV_AUTH_ACCOUNTS_FILE")
        if not path or not os.path.isfile(path):
            return False
        with _lock:
            with open(path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)
            uid_str = str(user_id)
            updated = False
            for acc in raw.get("accounts", []):
                if acc.get("id") == uid_str:
                    acc["password_hash"] = hash_password(new_password)
                    acc["must_change_password"] = must_change_password
                    updated = True
                    break
            if updated:
                with open(path, "w", encoding="utf-8") as fh:
                    json.dump(raw, fh, indent=2)
                _accounts_cache["mtime"] = None  # Invalidate cache
            return updated

    @staticmethod
    def create_account(
        *,
        first_name: str,
        last_name: str,
        email: str,
        phone: str,
        username: str,
        roles: list,
        temporary_password: str,
    ) -> Dict[str, Any]:
        """Persist a brand-new account to the dev auth JSON so it can actually log in.

        Stores an Argon2id hash of the temporary password and marks the account
        as must_change_password=True for the mandatory first-login change.
        """
        path = current_app.config.get("DEV_AUTH_ACCOUNTS_FILE")
        if not path or not os.path.isfile(path):
            raise APIException(
                message="Development authentication accounts file is missing.",
                status_code=503,
                error_code="DEV_AUTH_NOT_CONFIGURED",
            )

        clean_email = (email or "").strip().lower()
        clean_username = (username or "").strip()
        valid_roles = [r for r in roles if r in KNOWN_ROLES] or ["student"]

        account = {
            "id": str(uuid.uuid4()),
            "email": clean_email,
            "username": clean_username,
            "first_name": first_name,
            "last_name": last_name,
            "phone": phone,
            "roles": valid_roles,
            "password_hash": hash_password(temporary_password),
            "must_change_password": True,
            "is_active": True,
        }

        with _lock:
            with open(path, "r", encoding="utf-8") as fh:
                raw = json.load(fh)

            for acc in raw.get("accounts", []):
                if (acc.get("email") or "").strip().lower() == clean_email and clean_email:
                    raise APIException(
                        message=f"An account with email '{clean_email}' already exists.",
                        status_code=400,
                        error_code="ACCOUNT_EXISTS",
                    )
                if (acc.get("username") or "").strip().lower() == clean_username.lower() and clean_username:
                    raise APIException(
                        message=f"An account with Login ID '{clean_username}' already exists.",
                        status_code=400,
                        error_code="ACCOUNT_EXISTS",
                    )

            raw.setdefault("accounts", []).append(account)
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(raw, fh, indent=2)
            _accounts_cache["mtime"] = None  # Invalidate cache so the new account is visible

        current_app.logger.info("DEV AUTH account created: %s (%s)", clean_email or clean_username, ",".join(valid_roles))
        return account

    @staticmethod
    def change_password(
        user_id,
        current_password: str,
        new_password: str,
        confirm_password: Optional[str] = None,
        ip_address: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """Verify the current password and persist a new one (first-login or routine change)."""
        if not current_password or not new_password:
            raise APIException(
                message="Current password and new password are required.",
                status_code=400,
                error_code="PASSWORDS_REQUIRED",
            )
        if confirm_password is not None and new_password != confirm_password:
            raise APIException(
                message="New password and confirmation password do not match.",
                status_code=400,
                error_code="PASSWORDS_MISMATCH",
            )

        data = _load_accounts()
        account = data["accounts"].get(str(user_id))
        if not account:
            raise APIException(
                message="Account not found.",
                status_code=404,
                error_code="ACCOUNT_NOT_FOUND",
            )

        if not account.get("password_hash") or not verify_password(current_password, account["password_hash"]):
            raise APIException(
                message="Your current (temporary) password is incorrect.",
                status_code=400,
                error_code="INVALID_CURRENT_PASSWORD",
            )

        if current_password == new_password:
            raise APIException(
                message="New password must be different from your temporary password.",
                status_code=400,
                error_code="PASSWORD_REUSED",
            )

        is_valid, policy_err = validate_password_policy(new_password)
        if not is_valid:
            raise APIException(
                message=policy_err or "Password does not meet complexity requirements.",
                status_code=400,
                error_code="PASSWORD_TOO_WEAK",
            )

        if not DevAuthService.update_user_password(user_id, new_password, must_change_password=False):
            raise APIException(
                message="Could not update the password. Please try again.",
                status_code=500,
                error_code="PASSWORD_UPDATE_FAILED",
            )

        # Invalidate existing sessions so the temporary password can no longer be used.
        try:
            DevAuthService.logout_all_sessions(user_id)
        except Exception:
            pass

        current_app.logger.info("DEV AUTH password changed for account %s from %s", user_id, ip_address)
        return {"success": True}

    @staticmethod
    def request_password_reset(*args, **kwargs):
        raise DatabaseUnavailableError()

    @staticmethod
    def reset_password(*args, **kwargs):
        raise DatabaseUnavailableError()
