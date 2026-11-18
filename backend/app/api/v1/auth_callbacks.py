import uuid
from datetime import datetime, timezone
from flask import jsonify, current_app
from app.extensions import jwt, db
from app.models import TokenBlocklist, User
from app.services.dev_auth_service import DevAuthService, is_dev_auth_active


def register_jwt_callbacks(app):
    """Register custom token loaders, blocklist validators, and error responses for JWT-Extended."""

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload: dict) -> bool:
        """Check both explicit JTI blocklist and global user session invalidation."""
        if not current_app.config.get("DATABASE_ENABLED"):
            # Without a database only development-mode tokens can be valid; anything
            # else is treated as revoked rather than trusted unchecked.
            if is_dev_auth_active() and jwt_payload.get("auth_mode") == "development":
                return DevAuthService.is_token_revoked(jwt_payload)
            return True

        jti = jwt_payload.get("jti")
        user_id_str = jwt_payload.get("sub")

        if not jti:
            return True

        # Check 1: Explicit JTI blocklist entry
        token_entry = TokenBlocklist.query.filter_by(jti=jti).first()
        if token_entry is not None:
            return True

        # Check 2: Global user session invalidation (e.g. from password reset or logout-all)
        if user_id_str:
            try:
                user_uuid = uuid.UUID(user_id_str)
                iat_timestamp = jwt_payload.get("iat")
                if iat_timestamp:
                    token_iat = datetime.fromtimestamp(iat_timestamp, timezone.utc)
                    # Find any global revocation event created after this token was issued
                    global_revocation = TokenBlocklist.query.filter(
                        TokenBlocklist.user_id == user_uuid,
                        TokenBlocklist.token_type == "all",
                        TokenBlocklist.revoked_at >= token_iat
                    ).first()
                    if global_revocation is not None:
                        return True
            except Exception:
                pass

        return False

    @jwt.user_identity_loader
    def user_identity_lookup(user_id):
        return str(user_id)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        if not current_app.config.get("DATABASE_ENABLED"):
            return DevAuthService.get_user(identity) if is_dev_auth_active() else None
        try:
            return db.session.get(User, uuid.UUID(identity))
        except Exception:
            return None

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "success": False,
            "error": {
                "code": "TOKEN_EXPIRED",
                "message": "The token has expired. Please authenticate again or refresh your session.",
            }
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({
            "success": False,
            "error": {
                "code": "INVALID_TOKEN",
                "message": f"Signature verification failed or token is malformed: {error_string}",
            }
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({
            "success": False,
            "error": {
                "code": "AUTHORIZATION_REQUIRED",
                "message": f"Authorization header or authentication cookie is missing: {error_string}",
            }
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "success": False,
            "error": {
                "code": "TOKEN_REVOKED",
                "message": "This token has been revoked. Please authenticate again.",
            }
        }), 401
