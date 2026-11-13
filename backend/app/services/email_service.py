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


def get_development_mailbox(address: str) -> list[DevelopmentEmail]:
    if settings.app_env != "development" or settings.email_provider != "none":
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


def send_email(
    to_address: str,
    subject: str,
    html_body: str,
    text_body: str | None = None,
) -> None:
    provider = settings.email_provider
    if provider == "none":
        if settings.app_env == "development":
            _queue_development_email(to_address, subject, text_body or html_body)
            return
        raise EmailDeliveryError("Email delivery is not configured.")
    if provider == "smtp":
        _send_smtp(to_address, subject, html_body, text_body)
    elif provider == "sendgrid":
        _send_sendgrid(to_address, subject, html_body, text_body)
    elif provider == "postmark":
        _send_postmark(to_address, subject, html_body, text_body)


def send_auth_email(
    to_address: str,
    subject: str,
    action_url: str,
    action_description: str,
    expiry_description: str,
) -> None:
    safe_url = html.escape(action_url, quote=True)
    html_body = (
        "<html><body>"
        f"<p>{html.escape(action_description)}</p>"
        f'<p><a href="{safe_url}">Continuer</a></p>'
        f"<p>{html.escape(expiry_description)}</p>"
        "</body></html>"
    )
    text_body = f"{action_description}\n\n{action_url}\n\n{expiry_description}"
    try:
        send_email(to_address, subject, html_body, text_body)
    except (EmailDeliveryError, OSError, smtplib.SMTPException, urllib.error.URLError) as error:
        cause = error.__cause__ or error
        logger.error(
            "Authentication email delivery failed (%s)",
            type(cause).__name__,
        )


def _send_smtp(
    to_address: str, subject: str, html_body: str, text_body: str | None
) -> None:
    if not settings.smtp_host:
        raise EmailDeliveryError("SMTP host is not configured.")
    msg = MIMEMultipart("alternative")
    msg["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    msg["To"] = to_address
    msg["Subject"] = subject
    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_use_tls:
            server.starttls()
        if settings.smtp_username and settings.smtp_password:
            server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.email_from_address, to_address, msg.as_string())


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
