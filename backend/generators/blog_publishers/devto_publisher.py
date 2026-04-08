from __future__ import annotations

import os
from dataclasses import dataclass

import requests

from backend.db.session import SessionLocal
from backend.db.repositories.blog_repository import BlogRepository

def _get_blog_credential(platform: str) -> dict:
    db = SessionLocal()
    try:
        return BlogRepository(db).get_credential(platform) or {}
    finally:
        db.close()


@dataclass
class DevtoPublishResult:
    status: str
    platform_post_id: str | None
    url: str | None
    error: str | None


@dataclass
class DevtoValidateResult:
    valid: bool
    username: str | None
    error: str | None


def validate_credentials() -> DevtoValidateResult:
    cred = _get_blog_credential("devto")
    api_key = cred.get("api_key") or os.getenv("DEVTO_API_KEY")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True
    if not enabled:
        return DevtoValidateResult(valid=False, username=None, error="Dev.to publishing disabled")
    if not api_key:
        return DevtoValidateResult(valid=False, username=None, error="Missing Dev.to API key")
    try:
        resp = requests.get(
            "https://dev.to/api/users/me",
            headers={"api-key": api_key},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
        username = data.get("username") or data.get("name")
        return DevtoValidateResult(valid=True, username=str(username) if username else None, error=None)
    except Exception as e:
        return DevtoValidateResult(valid=False, username=None, error=str(e))


def publish_markdown(
    title: str,
    body_markdown: str,
    tags: list[str] | None = None,
    published: bool = False,
) -> DevtoPublishResult:
    cred = _get_blog_credential("devto")
    api_key = cred.get("api_key") or os.getenv("DEVTO_API_KEY")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True

    if not enabled:
        return DevtoPublishResult(status="disabled", platform_post_id=None, url=None, error="Dev.to publishing disabled")
    if not api_key:
        return DevtoPublishResult(status="error", platform_post_id=None, url=None, error="Missing Dev.to API key")

    tag_list = tags or []
    tag_list = [t.strip().lower().replace("#", "") for t in tag_list if isinstance(t, str) and t.strip()]
    tag_list = [t[:20] for t in tag_list][:4]

    payload = {
        "article": {
            "title": title,
            "body_markdown": body_markdown,
            "published": bool(published),
            "tags": tag_list,
        }
    }

    try:
        resp = requests.post(
            "https://dev.to/api/articles",
            headers={"api-key": api_key, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
        pid = str(data.get("id")) if data.get("id") is not None else None
        url = data.get("url")
        return DevtoPublishResult(status="published" if published else "draft", platform_post_id=pid, url=url, error=None)
    except Exception as e:
        return DevtoPublishResult(status="error", platform_post_id=None, url=None, error=str(e))
