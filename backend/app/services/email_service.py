"""Transactional email delivery and a loopback-only development mailbox."""

from __future__ import annotations

import html
import json
import logging
import smtplib
import threading
import urllib.error
import urllib.request
from collections import defaultdict, deque
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(Exception):
    """Raised when an authentication email could not be accepted for delivery."""


@dataclass(frozen=True)
class DevelopmentEmail:
    subject: str
    text_body: str


_mailbox_lock = threading.Lock()
_development_mailbox: dict[str, deque[DevelopmentEmail]] = defaultdict(deque)


def _normalized_email(address: str) -> str:
    return address.strip().lower()


def email_configuration_problems() -> list[str]:
    """Return setting names that block real delivery. Never includes secret values."""
    provider = settings.email_provider
    if provider == "none":
        if settings.app_env == "development" and settings.email_allow_development_mailbox:
            return []
        return ["EMAIL_PROVIDER"]
    problems: list[str] = []
    if not settings.email_from_address:
        problems.append("EMAIL_FROM_ADDRESS")
    if provider == "smtp":
        if not settings.smtp_host:
            problems.append("SMTP_HOST")
        if bool(settings.smtp_username) != bool(settings.smtp_password):
            problems.append("SMTP_USERNAME")
            problems.append("SMTP_PASSWORD")
    elif provider == "sendgrid" and not settings.sendgrid_api_key:
        problems.append("SENDGRID_API_KEY")
    elif provider == "postmark" and not settings.postmark_api_key:
        problems.append("POSTMARK_API_KEY")
    return problems


def get_development_mailbox(address: str) -> list[DevelopmentEmail]:
    if (
        settings.app_env != "development"
        or settings.email_provider != "none"
        or not settings.email_allow_development_mailbox
    ):
        raise EmailDeliveryError("Development mailbox is unavailable.")
    with _mailbox_lock:
        messages = list(_development_mailbox.pop(_normalized_email(address), ()))
    return messages


def clear_development_mailbox() -> None:
    with _mailbox_lock:
        _development_mailbox.clear()


def _queue_development_email(
    to_address: str, subject: str, text_body: str
) -> None:
    with _mailbox_lock:
        _development_mailbox[_normalized_email(to_address)].append(
            DevelopmentEmail(subject=subject, text_body=text_body)
        )


def render_transactional_email(
    *,
    heading: str,
    intro: str,
    action_url: str,
    action_label: str,
    expiry_description: str,
) -> tuple[str, str]:
    """Return HTML and plain text. The URL stays on text line 3 for link parsers."""
    safe_heading = html.escape(heading)
    safe_intro = html.escape(intro)
    safe_url = html.escape(action_url, quote=True)
    safe_label = html.escape(action_label)
    safe_expiry = html.escape(expiry_description)
    html_body = f"""<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.08em;color:#1d4ed8;font-weight:700;">PAJES</td></tr>
        <tr><td style="padding:0 32px 8px;font-size:22px;font-weight:700;">{safe_heading}</td></tr>
        <tr><td style="padding:0 32px 20px;font-size:15px;line-height:1.6;color:#334155;">{safe_intro}</td></tr>
        <tr><td style="padding:0 32px 20px;">
          <a href="{safe_url}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">{safe_label}</a>
        </td></tr>
        <tr><td style="padding:0 32px 8px;font-size:13px;line-height:1.5;color:#64748b;">{safe_expiry}</td></tr>
        <tr><td style="padding:0 32px 28px;font-size:12px;line-height:1.5;color:#94a3b8;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;">{safe_url}</span></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    text_body = (
        f"{intro}\n"
        f"\n"
        f"{action_url}\n"
        f"\n"
        f"{expiry_description}\n"
        f"\n"
        f"{action_label}"
    )
    return html_body, text_body


def render_security_email(summary: str) -> tuple[str, str]:
    safe_summary = html.escape(summary)
    html_body = f"""<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;background:#f4f6f8;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:28px 32px 8px;font-size:13px;letter-spacing:.08em;color:#1d4ed8;font-weight:700;">PAJES</td></tr>
        <tr><td style="padding:0 32px 8px;font-size:22px;font-weight:700;">Notification de sécurité</td></tr>
        <tr><td style="padding:0 32px 28px;font-size:15px;line-height:1.6;color:#334155;">{safe_summary}<br><br>Si vous n'êtes pas à l'origine de cette action, réinitialisez votre mot de passe et contactez l'administrateur du cabinet.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    text_body = (
        "Notification de sécurité PAJES\n"
        "\n"
        f"{summary}\n"
        "\n"
        "Si vous n'êtes pas à l'origine de cette action, réinitialisez votre mot de passe "
        "et contactez l'administrateur du cabinet."
    )
    return html_body, text_body


def send_email(
    to_address: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    provider = settings.email_provider
    if provider == "none":
        if settings.app_env == "development" and settings.email_allow_development_mailbox:
            _queue_development_email(to_address, subject, text_body or html_body)
            logger.info("Email queued in the development mailbox (%s)", provider)
            return
        raise EmailDeliveryError("Email delivery is not configured.")
    if provider == "smtp":
        _send_smtp(to_address, subject, html_body, text_body)
    elif provider == "sendgrid":
        _send_sendgrid(to_address, subject, html_body, text_body)
    elif provider == "postmark":
        _send_postmark(to_address, subject, html_body, text_body)
    else:
        raise EmailDeliveryError("Email delivery is not configured.")
    logger.info("Email accepted by provider %s", provider)


def send_auth_email(
    to_address: str,
    subject: str,
    action_url: str,
    action_description: str,
    expiry_description: str,
    *,
    action_label: str = "Continuer",
) -> None:
    html_body, text_body = render_transactional_email(
        heading=subject.removeprefix("PAJES — ").strip() or subject,
        intro=action_description,
        action_url=action_url,
        action_label=action_label,
        expiry_description=expiry_description,
    )
    try:
        send_email(to_address, subject, html_body, text_body)
    except (EmailDeliveryError, OSError, smtplib.SMTPException, urllib.error.URLError) as error:
        cause = error.__cause__ or error
        logger.error(
            "Authentication email delivery failed (%s)",
            type(cause).__name__,
        )


def send_security_email(to_address: str, summary: str) -> None:
    html_body, text_body = render_security_email(summary)
    try:
        send_email(to_address, "PAJES — Notification de sécurité", html_body, text_body)
    except (EmailDeliveryError, OSError, smtplib.SMTPException, urllib.error.URLError) as error:
        cause = error.__cause__ or error
        logger.error("Security email delivery failed (%s)", type(cause).__name__)


def _send_smtp(
    to_address: str, subject: str, html_body: str, text_body: str | None
) -> None:
    if not settings.smtp_host:
        raise EmailDeliveryError("SMTP host is not configured.")
    if "@" not in to_address or to_address.startswith("@") or to_address.endswith("@"):
        raise EmailDeliveryError("Recipient address is invalid.")
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    msg["To"] = to_address
    msg["Subject"] = subject
    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        if settings.smtp_port == 465:
            server_cm = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=10)
        else:
            server_cm = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10)
        with server_cm as server:
            server.ehlo()
            if settings.smtp_use_tls and settings.smtp_port != 465:
                server.starttls()
                server.ehlo()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.email_from_address, [to_address], msg.as_string())
    except smtplib.SMTPRecipientsRefused as error:
        raise EmailDeliveryError("SMTP rejected the recipient.") from error
    except smtplib.SMTPAuthenticationError as error:
        raise EmailDeliveryError("SMTP authentication failed.") from error
    except (OSError, smtplib.SMTPException) as error:
        raise EmailDeliveryError("SMTP delivery failed.") from error


def _send_sendgrid(
    to_address: str, subject: str, html_body: str, text_body: str | None
) -> None:
    if not settings.sendgrid_api_key:
        raise EmailDeliveryError("SendGrid API key is not configured.")
    content = [{"type": "text/html", "value": html_body}]
    if text_body:
        content.insert(0, {"type": "text/plain", "value": text_body})
    data = {
        "personalizations": [{"to": [{"email": to_address}]}],
        "from": {"email": settings.email_from_address, "name": settings.email_from_name},
        "subject": subject,
        "content": content,
    }
    request = urllib.request.Request(
        "https://api.sendgrid.com/v3/mail/send",
        data=json.dumps(data).encode(),
        headers={
            "Authorization": f"Bearer {settings.sendgrid_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status >= 400:
            raise EmailDeliveryError("SendGrid rejected the email.")


def _send_postmark(
    to_address: str, subject: str, html_body: str, text_body: str | None
) -> None:
    if not settings.postmark_api_key:
        raise EmailDeliveryError("Postmark API key is not configured.")
    data = {
        "From": f"{settings.email_from_name} <{settings.email_from_address}>",
        "To": to_address,
        "Subject": subject,
        "HtmlBody": html_body,
        "TextBody": text_body or "",
    }
    request = urllib.request.Request(
        "https://api.postmarkapp.com/email",
        data=json.dumps(data).encode(),
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": settings.postmark_api_key,
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        if response.status >= 400:
            raise EmailDeliveryError("Postmark rejected the email.")
