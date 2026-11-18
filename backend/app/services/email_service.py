import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Dict, Any, List
from flask import current_app


class EmailService:
    """Enterprise email notification service with HTML templates and test outbox."""

    def __init__(self):
        # In-memory outbox for testing and inspection
        self.outbox: List[Dict[str, Any]] = []

    def _send_email(self, to_email: str, subject: str, html_body: str, text_body: str) -> bool:
        """Internal dispatch via SMTP or test outbox."""
        message_data = {
            "to": to_email,
            "subject": subject,
            "html": html_body,
            "text": text_body,
        }
        self.outbox.append(message_data)

        # In testing mode or when SMTP host is unset/mocked, return early
        if current_app.config.get("TESTING") or os.getenv("SMTP_DISABLED", "false").lower() in ("true", "1"):
            current_app.logger.info("Email to %s queued in test outbox: %s", to_email, subject)
            return True

        smtp_host = os.getenv("SMTP_HOST", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_user = os.getenv("SMTP_USER", "")
        smtp_password = os.getenv("SMTP_PASSWORD", "")
        smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
        mail_from = os.getenv("MAIL_FROM", "noreply@schoolerp.edu")

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = mail_from
            msg["To"] = to_email

            part1 = MIMEText(text_body, "plain")
            part2 = MIMEText(html_body, "html")
            msg.attach(part1)
            msg.attach(part2)

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if smtp_use_tls:
                    server.starttls()
                if smtp_user and smtp_password:
                    server.login(smtp_user, smtp_password)
                server.sendmail(mail_from, [to_email], msg.as_string())

            current_app.logger.info("Email successfully dispatched to %s: %s", to_email, subject)
            return True
        except Exception as e:
            current_app.logger.warning("SMTP dispatch to %s failed: %s. Saved in local outbox.", to_email, e)
            return False

    def send_password_reset_email(self, to_email: str, user_name: str, raw_token: str, frontend_url: Optional[str] = None) -> bool:
        """Send password reset instructions containing single-use secure token."""
        base_url = frontend_url or os.getenv("FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{base_url}/reset-password?token={raw_token}"
        subject = "School ERP — Password Reset Request"

        text_body = f"""Hello {user_name},

A password reset request was submitted for your School ERP account.

To reset your password, visit the following secure link (valid for 30 minutes):
{reset_link}

If you did not request this change, please ignore this email or contact system administration immediately.

Regards,
School Management System Administration
"""

        html_body = f"""<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; }}
        .header {{ border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }}
        .button {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }}
        .footer {{ font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="color: #1e293b; margin: 0;">School ERP Portal</h2>
        </div>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>We received a request to reset the password for your School ERP account. Click the button below to establish a new password:</p>
        <p style="text-align: center;">
            <a href="{reset_link}" class="button">Reset Your Password</a>
        </p>
        <p>This password reset link is valid for <strong>30 minutes</strong> and can only be used once.</p>
        <p>If you did not request a password reset, no further action is required. Your account remains secure.</p>
        <div class="footer">
            <p>School Management System &bull; Automated Security Service &bull; Do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
"""
        return self._send_email(to_email, subject, html_body, text_body)

    def send_password_changed_notification(self, to_email: str, user_name: str) -> bool:
        """Send notification confirming that the account password was changed."""
        subject = "School ERP — Security Notice: Password Changed"
        text_body = f"""Hello {user_name},

This email confirms that the password for your School ERP account was successfully updated.

If you made this change, no further action is needed.
If you did NOT authorize this change, please contact system administration immediately.

Regards,
School ERP Security Team
"""
        html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e293b;">Security Notice: Password Updated</h2>
        <p>Dear <strong>{user_name}</strong>,</p>
        <p>The password for your School ERP account has been successfully updated.</p>
        <p>All active sessions on other devices have been automatically signed out for your protection.</p>
        <p style="color: #dc2626; font-weight: 500;">If you did not perform this action, please alert your school administrator immediately.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;">
        <p style="font-size: 12px; color: #64748b;">School Management System Security Service</p>
    </div>
</body>
</html>
"""
        return self._send_email(to_email, subject, html_body, text_body)


# Singleton email service
email_service = EmailService()

