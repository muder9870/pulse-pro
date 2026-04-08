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
class MediumPublishResult:
    status: str
    platform_post_id: str | None
    url: str | None
    error: str | None


@dataclass
class MediumValidateResult:
    valid: bool
    user_id: str | None
    error: str | None


def validate_credentials() -> MediumValidateResult:
    cred = _get_blog_credential("medium")
    token = cred.get("api_key") or os.getenv("MEDIUM_TOKEN")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True
    if not enabled:
        return MediumValidateResult(valid=False, user_id=None, error="Medium publishing disabled")
    if not token:
        return MediumValidateResult(valid=False, user_id=None, error="Missing Medium token")
    try:
        user_id = _get_user_id(str(token))
        if not user_id:
            return MediumValidateResult(valid=False, user_id=None, error="Could not read Medium user id")
        return MediumValidateResult(valid=True, user_id=user_id, error=None)
    except Exception as e:
        return MediumValidateResult(valid=False, user_id=None, error=str(e))


def _get_user_id(token: str) -> str:
    resp = requests.get(
        "https://api.medium.com/v1/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json() if resp.content else {}
    return str((data.get("data") or {}).get("id") or "")


def publish_markdown(
    title: str,
    content_markdown: str,
    tags: list[str] | None = None,
    publish_status: str = "draft",
) -> MediumPublishResult:
    cred = _get_blog_credential("medium")
    token = cred.get("api_key") or os.getenv("MEDIUM_TOKEN")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True

    if not enabled:
        return MediumPublishResult(status="disabled", platform_post_id=None, url=None, error="Medium publishing disabled")
    if not token:
        return MediumPublishResult(status="error", platform_post_id=None, url=None, error="Missing Medium token")

    tags_list = tags or []
    tags_list = [t.strip().lower().replace("#", "") for t in tags_list if isinstance(t, str) and t.strip()]
    tags_list = [t for t in tags_list if t][:5]

    if publish_status not in {"draft", "public", "unlisted"}:
        publish_status = "draft"

    try:
        user_id = _get_user_id(token)
        if not user_id:
            return MediumPublishResult(status="error", platform_post_id=None, url=None, error="Could not read Medium user id")

        payload = {
            "title": title,
            "contentFormat": "markdown",
            "content": content_markdown,
            "tags": tags_list,
            "publishStatus": publish_status,
        }
        resp = requests.post(
            f"https://api.medium.com/v1/users/{user_id}/posts",
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
        post = data.get("data") or {}
        pid = str(post.get("id")) if post.get("id") is not None else None
        url = post.get("url")
        status = "published" if publish_status == "public" else "draft"
        return MediumPublishResult(status=status, platform_post_id=pid, url=url, error=None)
    except Exception as e:
        return MediumPublishResult(status="error", platform_post_id=None, url=None, error=str(e))
