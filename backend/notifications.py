from __future__ import annotations

import json
import logging
import smtplib
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Any
from urllib.parse import urlparse

import requests

from backend.config import settings


@dataclass(frozen=True)
class NotificationResult:
    delivered: bool
    channel: str
    detail: str | None = None


def _want_notify(outcome: str) -> bool:
    mode = str(getattr(settings, "NOTIFY_ON", "failure") or "failure").lower().strip()
    if mode in {"0", "off", "false", "none"}:
        return False
    if mode in {"always", "all"}:
        return True
    if mode == "success":
        return outcome == "success"
    if mode == "failure":
        return outcome == "failure"
    return outcome == "failure"


def _format_subject(outcome: str, duration_s: float | None) -> str:
    suffix = ""
    if duration_s is not None:
        suffix = f" ({int(duration_s)}s)"
    return f"AI Pulse Pro pipeline: {outcome}{suffix}"


def _format_text(payload: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(_format_subject(str(payload.get("outcome") or "unknown"), payload.get("duration_s")))
    started = payload.get("started_at")
    finished = payload.get("finished_at")
    if started:
        lines.append(f"started_at: {started}")
    if finished:
        lines.append(f"finished_at: {finished}")
    if payload.get("duration_s") is not None:
        lines.append(f"duration_s: {payload.get('duration_s')}")
    if payload.get("errors"):
        lines.append("")
        lines.append("errors:")
        for e in payload.get("errors") or []:
            lines.append(f"- {e}")
    return "\n".join(lines).strip() + "\n"


def notify_pipeline_run(payload: dict[str, Any]) -> list[NotificationResult]:
    outcome = str(payload.get("outcome") or "unknown").lower()
    if outcome not in {"success", "failure"}:
        outcome = "failure" if payload.get("errors") else "success"

    if not _want_notify(outcome):
        return []

    results: list[NotificationResult] = []

    webhook_url = getattr(settings, "NOTIFY_WEBHOOK_URL", None)
    if webhook_url:
        try:
            results.append(_send_webhook(webhook_url, payload))
        except Exception as e:
            logging.getLogger("notify").warning("webhook_failed error=%s", e)

    if getattr(settings, "SMTP_HOST", None) and getattr(settings, "NOTIFY_EMAIL_TO", None):
        try:
            results.append(_send_email(payload))
        except Exception as e:
            logging.getLogger("notify").warning("email_failed error=%s", e)

    return results


def notify_users(title: str, message: str, level: str = "info") -> list[NotificationResult]:
    """Simple generic wrapper to notify users via all configured channels."""
    payload = {
        "outcome": level,
        "errors": [f"{title}: {message}"] if level == "error" else [],
        "message": f"{title}\n\n{message}"
    }
    return notify_pipeline_run(payload)


def _send_webhook(url: str, payload: dict[str, Any]) -> NotificationResult:
    p = urlparse(url)
    if p.scheme not in {"http", "https"}:
        raise ValueError("NOTIFY_WEBHOOK_URL must be http(s)")

    text = _format_text(payload)
    body = {"text": text, "payload": payload}
    r = requests.post(url, json=body, timeout=10)
    if r.status_code >= 400:
        return NotificationResult(delivered=False, channel="webhook", detail=f"http_{r.status_code}")
    return NotificationResult(delivered=True, channel="webhook")


def _send_email(payload: dict[str, Any]) -> NotificationResult:
    host = str(getattr(settings, "SMTP_HOST"))
    port = int(getattr(settings, "SMTP_PORT", 587) or 587)
    user = getattr(settings, "SMTP_USERNAME", None)
    password = getattr(settings, "SMTP_PASSWORD", None)
    use_tls = str(getattr(settings, "SMTP_USE_TLS", "true")).lower() in {"1", "true", "yes"}

    to_addr = str(getattr(settings, "NOTIFY_EMAIL_TO"))
    from_addr = str(getattr(settings, "NOTIFY_EMAIL_FROM") or to_addr)

    msg = EmailMessage()
    msg["To"] = to_addr
    msg["From"] = from_addr
    msg["Subject"] = _format_subject(str(payload.get("outcome") or "unknown"), payload.get("duration_s"))
    msg.set_content(_format_text(payload))

    with smtplib.SMTP(host, port, timeout=10) as s:
        s.ehlo()
        if use_tls:
            s.starttls()
            s.ehlo()
        if user and password:
            s.login(str(user), str(password))
        s.send_message(msg)

    return NotificationResult(delivered=True, channel="email")

