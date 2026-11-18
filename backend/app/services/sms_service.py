import os
import json
import urllib.parse
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

from flask import current_app


class SMSService:
    """Real SMS delivery for India (MSG91 / Fast2SMS) with a dev outbox fallback.

    Configure via environment variables:

      SMS_PROVIDER      msg91 | fast2sms | console   (default: console)
      SMS_SENDER_ID     6-char DLT-approved sender/header (e.g. STXAVR)

      # MSG91 (https://control.msg91.com)
      MSG91_AUTH_KEY        your MSG91 auth key
      MSG91_TEMPLATE_ID     DLT-approved Flow template id (contains ##var## slots)

      # Fast2SMS (https://www.fast2sms.com)
      FAST2SMS_API_KEY      your Fast2SMS API key
      FAST2SMS_ROUTE        'dlt' (needs FAST2SMS_SENDER_ID + message id) or 'q' (quick, testing)

    When no provider/keys are set, messages are written to an in-memory outbox
    and logged, so the app never silently claims an SMS was sent.
    """

    def __init__(self) -> None:
        # In-memory outbox for testing and inspection (mirrors EmailService)
        self.outbox: List[Dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _normalize_number(phone: str) -> str:
        """Return a bare 10-digit Indian number plus country code (91XXXXXXXXXX)."""
        digits = "".join(ch for ch in (phone or "") if ch.isdigit())
        if len(digits) > 10 and digits.startswith("91"):
            digits = digits[-10:]
        elif len(digits) > 10:
            digits = digits[-10:]
        return f"91{digits}" if len(digits) == 10 else digits

    @staticmethod
    def _parse(body: str) -> Any:
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {"raw": body}

    @classmethod
    def _http_post(cls, url: str, data: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return {"status": resp.status, "body": cls._parse(resp.read().decode("utf-8", "replace"))}
        except urllib.error.HTTPError as e:
            # Gateways return the real reason in the error body — surface it.
            return {"status": e.code, "body": cls._parse(e.read().decode("utf-8", "replace"))}

    # ------------------------------------------------------------------
    # Providers
    # ------------------------------------------------------------------
    def _send_msg91(self, to: str, variables: Dict[str, str]) -> bool:
        auth_key = os.getenv("MSG91_AUTH_KEY", "")
        template_id = os.getenv("MSG91_TEMPLATE_ID", "")
        sender = os.getenv("SMS_SENDER_ID", "")
        if not auth_key or not template_id:
            raise RuntimeError("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID must be set.")

        recipient: Dict[str, str] = {"mobiles": to}
        recipient.update(variables)  # DLT template variables, e.g. {"var1": "...", "var2": "..."}

        payload = {
            "template_id": template_id,
            "short_url": "0",
            "recipients": [recipient],
        }
        if sender:
            payload["sender"] = sender

        result = self._http_post(
            "https://control.msg91.com/api/v5/flow/",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "authkey": auth_key,
            },
        )
        body = result["body"] if isinstance(result["body"], dict) else {"raw": result["body"]}
        current_app.logger.info("MSG91 send to %s -> %s", to, body)
        ok = str(body.get("type", "")).lower() == "success"
        if not ok:
            raise RuntimeError(body.get("message") or body.get("raw") or f"MSG91 rejected the request (HTTP {result['status']}).")
        return True

    def _send_fast2sms(self, to: str, message: str, variables_values: str = "") -> bool:
        api_key = os.getenv("FAST2SMS_API_KEY", "")
        route = os.getenv("FAST2SMS_ROUTE", "q")
        sender_id = os.getenv("SMS_SENDER_ID", "")
        if not api_key:
            raise RuntimeError("FAST2SMS_API_KEY must be set.")

        # Fast2SMS expects the bare 10-digit number
        number10 = to[-10:]
        params: Dict[str, str] = {"route": route, "numbers": number10}

        if route == "dlt":
            params["sender_id"] = sender_id
            params["message"] = os.getenv("FAST2SMS_MESSAGE_ID", "")  # DLT message template id
            params["variables_values"] = variables_values
        else:
            params["message"] = message
            params["language"] = "english"
            params["flash"] = "0"

        url = "https://www.fast2sms.com/dev/bulkV2?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(
            url,
            headers={"authorization": api_key, "cache-control": "no-cache"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                parsed = self._parse(resp.read().decode("utf-8", "replace"))
        except urllib.error.HTTPError as e:
            parsed = self._parse(e.read().decode("utf-8", "replace"))

        current_app.logger.info("Fast2SMS send to %s -> %s", number10, parsed)
        ok = bool(parsed.get("return")) if isinstance(parsed, dict) else False
        if not ok:
            # e.g. "You need to complete one transaction of 100 INR or more before using API route."
            msg = parsed.get("message") if isinstance(parsed, dict) else None
            raise RuntimeError(msg or "Fast2SMS rejected the request.")
        return True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def send_sms(self, phone: str, message: str, variables: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Dispatch a single SMS. Returns {'sent': bool, 'provider': str, 'detail': str}."""
        provider = os.getenv("SMS_PROVIDER", "console").lower()
        to = self._normalize_number(phone)
        variables = variables or {}

        record = {"to": to, "message": message, "provider": provider}
        self.outbox.append(record)

        if not to or len(to) < 12:
            return {"sent": False, "provider": provider, "detail": f"Invalid phone number: {phone}"}

        # Dev / unconfigured mode: never pretend it was delivered
        if provider == "console" or current_app.config.get("TESTING"):
            current_app.logger.info("[SMS OUTBOX] to %s: %s", to, message)
            return {
                "sent": False,
                "provider": "console",
                "detail": "SMS not sent: no SMS provider configured (SMS_PROVIDER=console). "
                          "Set SMS_PROVIDER=msg91 or fast2sms with API keys to deliver real SMS.",
            }

        try:
            if provider == "msg91":
                sent = self._send_msg91(to, variables)
            elif provider == "fast2sms":
                variables_values = variables.get("variables_values", "")
                sent = self._send_fast2sms(to, message, variables_values)
            else:
                return {"sent": False, "provider": provider, "detail": f"Unknown SMS_PROVIDER '{provider}'."}
            return {
                "sent": sent,
                "provider": provider,
                "detail": "Delivered to gateway." if sent else "Gateway rejected the message.",
            }
        except Exception as e:  # network error, bad keys, etc.
            current_app.logger.warning("SMS dispatch to %s failed: %s", to, e)
            return {"sent": False, "provider": provider, "detail": f"SMS gateway error: {e}"}

    def send_credentials(
        self,
        phone: str,
        person_name: str,
        login_id: str,
        temporary_password: str,
        role: str = "user",
        portal_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send login ID + temporary password to a newly registered user's mobile."""
        portal_url = portal_url or os.getenv("FRONTEND_URL", "http://localhost:5173") + "/login"
        school = os.getenv("SCHOOL_NAME", "St. Xavier's Academy")
        message = (
            f"{school}: Welcome {person_name}. Your {role} login -> ID: {login_id} "
            f"Password: {temporary_password}. Login at {portal_url} and change your password. "
            "Do not share these details."
        )
        # For MSG91/Fast2SMS DLT, map the dynamic parts to template variables.
        variables = {
            "var1": person_name,
            "var2": login_id,
            "var3": temporary_password,
            "variables_values": f"{person_name}|{login_id}|{temporary_password}",
        }
        return self.send_sms(phone, message, variables)


# Singleton SMS service (mirrors email_service)
sms_service = SMSService()
