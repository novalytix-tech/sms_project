"""Clerk session-token verification and the small slice of the Clerk Backend API we use.

The frontend obtains a short-lived session token from Clerk and sends it as
``Authorization: Bearer <token>``. We verify its RS256 signature against Clerk's
public keys (JWKS, or the PEM public key for networkless verification), then check
expiry, not-before and the authorized party (``azp``) claim.
"""
import threading
from typing import Optional

import jwt
import requests
from flask import current_app

CLERK_API_BASE = "https://api.clerk.com/v1"
_HTTP_TIMEOUT = 10
_USER_AGENT = "sms-backend/1.0"

_jwks_lock = threading.Lock()
_jwks_client: Optional[jwt.PyJWKClient] = None


class ClerkAuthError(Exception):
    """Raised when a session token is missing, malformed, expired or not trusted."""


def _secret_key() -> str:
    key = current_app.config.get("CLERK_SECRET_KEY")
    if not key:
        raise ClerkAuthError("Authentication is not configured on the server.")
    return key


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    with _jwks_lock:
        if _jwks_client is None:
            _jwks_client = jwt.PyJWKClient(
                f"{CLERK_API_BASE}/jwks",
                # Clerk's API rejects urllib's default "Python-urllib" User-Agent with 403.
                headers={"Authorization": f"Bearer {_secret_key()}", "User-Agent": _USER_AGENT},
                cache_keys=True,
                lifespan=3600,
                timeout=_HTTP_TIMEOUT,
            )
        return _jwks_client


def _signing_key(token: str):
    pem = current_app.config.get("CLERK_JWT_KEY")
    if pem:
        return pem.replace("\\n", "\n")
    return _get_jwks_client().get_signing_key_from_jwt(token).key


def verify_session_token(token: str) -> dict:
    """Return verified claims for a Clerk session token, or raise ClerkAuthError."""
    if not token:
        raise ClerkAuthError("Missing session token.")
    try:
        claims = jwt.decode(
            token,
            _signing_key(token),
            algorithms=["RS256"],
            options={"require": ["exp", "iat", "sub"], "verify_aud": False},
            leeway=5,
        )
    except jwt.ExpiredSignatureError as exc:
        raise ClerkAuthError("Session expired.") from exc
    except (jwt.PyJWTError, requests.RequestException) as exc:
        raise ClerkAuthError("Invalid session token.") from exc

    authorized_parties = current_app.config.get("CLERK_AUTHORIZED_PARTIES") or []
    azp = claims.get("azp")
    if authorized_parties and azp not in authorized_parties:
        raise ClerkAuthError("Session token was issued for an untrusted origin.")

    # Clerk marks tokens of users who still have a pending task (e.g. MFA setup).
    if claims.get("sts") == "pending":
        raise ClerkAuthError("Session is not fully authenticated yet.")
    return claims


def _api(method: str, path: str, **kwargs) -> dict:
    resp = requests.request(
        method,
        f"{CLERK_API_BASE}{path}",
        headers={"Authorization": f"Bearer {_secret_key()}", "User-Agent": _USER_AGENT},
        timeout=_HTTP_TIMEOUT,
        **kwargs,
    )
    if resp.status_code >= 400:
        current_app.logger.warning("Clerk API %s %s failed with %s", method, path, resp.status_code)
        resp.raise_for_status()
    return resp.json() if resp.content else {}


def get_verified_primary_email(clerk_user_id: str) -> Optional[str]:
    """Fetch a Clerk user and return their primary email if it is verified."""
    user = _api("GET", f"/users/{clerk_user_id}")
    primary_id = user.get("primary_email_address_id")
    for addr in user.get("email_addresses", []):
        if addr.get("id") == primary_id:
            if (addr.get("verification") or {}).get("status") == "verified":
                return (addr.get("email_address") or "").strip().lower() or None
            return None
    return None


def create_invitation(email: str, redirect_url: Optional[str] = None) -> dict:
    """Invite a school-provisioned user to create their Clerk account."""
    body = {"email_address": email, "ignore_existing": True, "notify": True}
    if redirect_url:
        body["redirect_url"] = redirect_url
    return _api("POST", "/invitations", json=body)
