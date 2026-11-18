import re
import secrets
import hashlib
import time
import threading
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from app.utils.errors import APIException
from app.utils.security import hash_password, validate_password_policy


class OTPService:
    """Enterprise OTP verification and password reset service for mobile & email channels."""

    _lock = threading.Lock()
    _sessions: Dict[str, Dict[str, Any]] = {}      # session_id -> session_data
    _reset_tokens: Dict[str, Dict[str, Any]] = {}  # reset_token -> reset_data
    _cooldowns: Dict[str, float] = {}              # identifier -> last_sent_epoch
    _resend_counts: Dict[str, int] = {}            # identifier -> count

    @classmethod
    def _clean_stale(cls):
        now = time.time()
        with cls._lock:
            # Purge sessions expired > 10 minutes ago
            stale_sessions = [k for k, v in cls._sessions.items() if v.get("expires_at", 0) < now - 600]
            for k in stale_sessions:
                del cls._sessions[k]

            # Purge reset tokens expired > 15 minutes ago
            stale_tokens = [k for k, v in cls._reset_tokens.items() if v.get("expires_at", 0) < now]
            for k in stale_tokens:
                del cls._reset_tokens[k]

    @classmethod
    def mask_phone(cls, phone: Optional[str]) -> str:
        if not phone:
            return "+91 ******XXXX"
        digits = re.sub(r"[^\d]", "", phone)
        if len(digits) >= 10:
            return f"+91 {digits[-10:-7]}*** **{digits[-4:]}"
        return f"+91 ***{phone[-4:]}" if len(phone) >= 4 else "+91 *******"

    @classmethod
    def mask_email(cls, email: Optional[str]) -> str:
        if not email or "@" not in email:
            return "****@domain.com"
        local, domain = email.split("@", 1)
        masked_local = local[0] + "***" + (local[-1] if len(local) > 1 else "")
        return f"{masked_local}@{domain}"

    @classmethod
    def request_otp(
        cls,
        identifier: str,
        user_resolver_fn,
        channel: str = "sms"
    ) -> Dict[str, Any]:
        """Generate and dispatch a 6-digit OTP prioritizing registered mobile number."""
        cls._clean_stale()
        if not identifier or not identifier.strip():
            raise APIException(
                message="Registered mobile number, email, or Login ID is required.",
                status_code=400,
                error_code="IDENTIFIER_REQUIRED"
            )

        clean_id = identifier.strip().lower()
        now = time.time()

        # Enforce 60-second resend cooldown
        with cls._lock:
            last_sent = cls._cooldowns.get(clean_id, 0)
            if now - last_sent < 60:
                wait_seconds = int(60 - (now - last_sent))
                raise APIException(
                    message=f"Please wait {wait_seconds} seconds before requesting a new OTP.",
                    status_code=429,
                    error_code="OTP_COOLDOWN_ACTIVE",
                    details={"retry_after": wait_seconds}
                )

            # Limit to 5 requests per hour
            count = cls._resend_counts.get(clean_id, 0)
            if count >= 5:
                raise APIException(
                    message="Too many OTP requests. Please try again after 1 hour or contact school administration.",
                    status_code=429,
                    error_code="OTP_LIMIT_EXCEEDED"
                )

        # Resolve user
        user = user_resolver_fn(clean_id)
        if not user:
            # Prevent user enumeration but provide clear guidance for school environment
            raise APIException(
                message="No account found matching this mobile number, email, or Login ID.",
                status_code=404,
                error_code="ACCOUNT_NOT_FOUND"
            )

        phone = user.get("phone")
        email = user.get("email")

        # Cryptographically secure 6-digit OTP
        otp = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(otp.encode("utf-8")).hexdigest()
        session_id = secrets.token_urlsafe(24)

        masked_phone = cls.mask_phone(phone)
        masked_email = cls.mask_email(email)

        # 10 minutes expiry
        expires_at = now + 600

        with cls._lock:
            cls._sessions[session_id] = {
                "user_id": user["id"],
                "email": user["email"],
                "phone": user.get("phone"),
                "username": user.get("username"),
                "full_name": user.get("full_name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                "otp_hash": otp_hash,
                "expires_at": expires_at,
                "attempts_left": 5,
                "channel": channel,
                "created_at": now,
            }
            cls._cooldowns[clean_id] = now
            cls._resend_counts[clean_id] = count + 1

        sms_preview = (
            f"[SMS Alert] St. Xavier's Academy: Your OTP for password reset is {otp}. "
            "Valid for 10 minutes. Do not share with anyone."
        )

        return {
            "session_id": session_id,
            "channel": "sms" if phone else "email",
            "masked_phone": masked_phone,
            "masked_email": masked_email,
            "expires_in": 600,
            "simulated_sms": sms_preview,
            "debug_otp": otp,  # Included for immediate UI testing & seamless offline demonstration
        }

    @classmethod
    def verify_otp(cls, session_id: str, otp_code: str) -> Dict[str, Any]:
        """Verify the 6-digit OTP and generate a single-use password reset token."""
        cls._clean_stale()
        if not session_id or not otp_code or not otp_code.strip():
            raise APIException(
                message="Verification session ID and 6-digit OTP code are required.",
                status_code=400,
                error_code="OTP_REQUIRED"
            )

        clean_otp = otp_code.strip()
        now = time.time()

        with cls._lock:
            session = cls._sessions.get(session_id)
            if not session:
                raise APIException(
                    message="OTP session has expired or is invalid. Please request a new OTP.",
                    status_code=400,
                    error_code="SESSION_EXPIRED"
                )

            if now > session["expires_at"]:
                del cls._sessions[session_id]
                raise APIException(
                    message="This OTP has expired. Please request a new OTP.",
                    status_code=400,
                    error_code="OTP_EXPIRED"
                )

            if session["attempts_left"] <= 0:
                del cls._sessions[session_id]
                raise APIException(
                    message="Maximum incorrect attempts exceeded. This OTP is now locked. Please request a new one.",
                    status_code=400,
                    error_code="OTP_LOCKED"
                )

            submitted_hash = hashlib.sha256(clean_otp.encode("utf-8")).hexdigest()
            if not secrets.compare_digest(submitted_hash, session["otp_hash"]):
                session["attempts_left"] -= 1
                remaining = session["attempts_left"]
                raise APIException(
                    message=f"Incorrect OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
                    status_code=400,
                    error_code="INVALID_OTP",
                    details={"attempts_left": remaining}
                )

            # Valid OTP! Issue single-use password reset token (valid for 15 minutes)
            reset_token = secrets.token_urlsafe(32)
            cls._reset_tokens[reset_token] = {
                "user_id": session["user_id"],
                "email": session["email"],
                "expires_at": now + 900,
            }

            # Invalidate session so OTP cannot be reused
            del cls._sessions[session_id]

        return {
            "reset_token": reset_token,
            "message": "OTP verified successfully. You may now set your new password.",
        }

    @classmethod
    def reset_password(
        cls,
        reset_token: str,
        new_password: str,
        confirm_password: str,
        password_updater_fn
    ) -> Dict[str, Any]:
        """Validate single-use reset token and set new password via Argon2id."""
        cls._clean_stale()
        if not reset_token:
            raise APIException(
                message="Password reset authorization token is missing or expired.",
                status_code=400,
                error_code="RESET_TOKEN_REQUIRED"
            )

        if not new_password or not confirm_password:
            raise APIException(
                message="New password and confirm password are required.",
                status_code=400,
                error_code="PASSWORDS_REQUIRED"
            )

        if new_password != confirm_password:
            raise APIException(
                message="New password and confirmation password do not match.",
                status_code=400,
                error_code="PASSWORDS_MISMATCH"
            )

        # Validate password policy
        is_valid, policy_err = validate_password_policy(new_password)
        if not is_valid:
            raise APIException(
                message=policy_err or "Password does not meet complexity requirements.",
                status_code=400,
                error_code="PASSWORD_TOO_WEAK"
            )

        now = time.time()
        with cls._lock:
            token_data = cls._reset_tokens.get(reset_token)
            if not token_data or now > token_data["expires_at"]:
                if reset_token in cls._reset_tokens:
                    del cls._reset_tokens[reset_token]
                raise APIException(
                    message="Password reset session has expired. Please verify OTP again.",
                    status_code=400,
                    error_code="RESET_TOKEN_EXPIRED"
                )

            user_id = token_data["user_id"]
            # Burn reset token so it can never be reused
            del cls._reset_tokens[reset_token]

        # Execute persistent password update
        password_updater_fn(user_id, new_password)

        return {
            "success": True,
            "message": "Your password has been successfully updated. You can now login with your new credentials.",
        }
