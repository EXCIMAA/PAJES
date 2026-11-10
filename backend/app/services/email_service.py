"""Email service — configurable transactional email provider.

Supports SMTP, SendGrid, and Postmark. Provider is selected via the
EMAIL_PROVIDER env var. When set to "none", emails are logged but not
sent (development mode).
"""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def send_email(to_address: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    provider = settings.email_provider
    if provider == "none":
        # Development mode — log instead of sending
        print(f"[EMAIL] To: {to_address} | Subject: {subject}")  # noqa: T201
        print(f"[EMAIL] Body: {text_body or html_body[:200]}")  # noqa: T201
        return
    if provider == "smtp":
        _send_smtp(to_address, subject, html_body, text_body)
    elif provider == "sendgrid":
        _send_sendgrid(to_address, subject, html_body, text_body)
    elif provider == "postmark":
        _send_postmark(to_address, subject, html_body, text_body)
    else:
        print(f"[EMAIL] Unknown provider '{provider}', logging only")  # noqa: T201
        print(f"[EMAIL] To: {to_address} | Subject: {subject}")  # noqa: T201


def _send_smtp(to_address: str, subject: str, html_body: str, text_body: str | None) -> None:
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    msg["To"] = to_address
    msg["Subject"] = subject
    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.email_from_address, to_address, msg.as_string())


def _send_sendgrid(to_address: str, subject: str, html_body: str, text_body: str | None) -> None:
    import urllib.request

    data = {
        "personalizations": [{"to": [{"email": to_address}]}],
        "from": {"email": settings.email_from_address, "name": settings.email_from_name},
        "subject": subject,
        "content": [
            {"type": "text/html", "value": html_body},
        ],
    }
    if text_body:
        data["content"].insert(0, {"type": "text/plain", "value": text_body})

    import json

    body = json.dumps(data).encode()
    req = urllib.request.Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.sendgrid_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    urllib.request.urlopen(req)


def _send_postmark(to_address: str, subject: str, html_body: str, text_body: str | None) -> None:
    import urllib.request

    data = {
        "From": f"{settings.email_from_name} <{settings.email_from_address}>",
        "To": to_address,
        "Subject": subject,
        "HtmlBody": html_body,
    }
    if text_body:
        data["TextBody"] = text_body

    import json

    body = json.dumps(data).encode()
    req = urllib.request.Request(
        "https://api.postmarkapp.com/email",
        data=body,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": settings.postmark_api_key,
        },
        method="POST",
    )
    urllib.request.urlopen(req)


def send_password_reset_email(to_address: str, reset_url: str) -> None:
    html = f"""
    <html><body>
    <h2>Réinitialisation de votre mot de passe PAJES</h2>
    <p>You requested a password reset for your PAJES account.</p>
    <p>Click the link below to set a new password. This link expires in 15 minutes:</p>
    <p><a href="{reset_url}">{reset_url}</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
    </body></html>
    """
    text = f"PAJES password reset. Visit this link (expires in 15 min): {reset_url}"
    send_email(to_address, "PAJES — Password Reset", html, text)
