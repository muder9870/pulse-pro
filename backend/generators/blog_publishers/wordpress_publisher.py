from __future__ import annotations

import base64
import os
import re
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
class WordPressPublishResult:
    status: str
    platform_post_id: str | None
    url: str | None
    error: str | None


@dataclass
class WordPressValidateResult:
    valid: bool
    site_name: str | None
    username: str | None
    error: str | None


def markdown_to_html(md: str) -> str:
    lines = (md or "").splitlines()
    out: list[str] = []
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if s.startswith("### "):
            out.append(f"<h3>{_escape(s[4:])}</h3>")
        elif s.startswith("## "):
            out.append(f"<h2>{_escape(s[3:])}</h2>")
        elif s.startswith("# "):
            out.append(f"<h1>{_escape(s[2:])}</h1>")
        elif s.startswith("- "):
            out.append(f"<li>{_escape(s[2:])}</li>")
        else:
            out.append(f"<p>{_escape(s)}</p>")
    html = "\n".join(out)
    html = re.sub(r"(</li>\n<li>)", "</li><li>", html)
    html = html.replace("</li><li>", "</li>\n<li>")
    html = re.sub(r"(<li>.*?</li>)", r"<ul>\1</ul>", html, flags=re.DOTALL)
    return html


def _escape(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#39;")
    )


def _auth_header(username: str, app_password: str) -> str:
    token = base64.b64encode(f"{username}:{app_password}".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def _ensure_tag(site_url: str, auth: str, tag: str) -> int | None:
    tag = tag.strip().lower().replace("#", "")
    if not tag:
        return None
    try:
        resp = requests.get(
            f"{site_url.rstrip('/')}/wp-json/wp/v2/tags",
            headers={"Authorization": auth},
            params={"search": tag, "per_page": 100},
            timeout=30,
        )
        resp.raise_for_status()
        items = resp.json() if resp.content else []
        for it in items:
            if str(it.get("name", "")).lower() == tag:
                return int(it.get("id"))
    except Exception:
        pass

    try:
        resp = requests.post(
            f"{site_url.rstrip('/')}/wp-json/wp/v2/tags",
            headers={"Authorization": auth, "Content-Type": "application/json"},
            json={"name": tag},
            timeout=30,
        )
        resp.raise_for_status()
        it = resp.json() if resp.content else {}
        return int(it.get("id"))
    except Exception:
        return None


def validate_credentials() -> WordPressValidateResult:
    cred = _get_blog_credential("wordpress")
    site_url = cred.get("site_url") or os.getenv("WORDPRESS_SITE_URL")
    username = cred.get("username") or os.getenv("WORDPRESS_USERNAME")
    app_password = cred.get("api_key") or os.getenv("WORDPRESS_APP_PASSWORD")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True

    if not enabled:
        return WordPressValidateResult(valid=False, site_name=None, username=None, error="WordPress publishing disabled")
    if not site_url or not username or not app_password:
        return WordPressValidateResult(valid=False, site_name=None, username=None, error="Missing WordPress credentials")

    auth = _auth_header(str(username), str(app_password))
    base = str(site_url).rstrip("/")
    try:
        r1 = requests.get(f"{base}/wp-json", timeout=20)
        r1.raise_for_status()
        site_name = None
        try:
            j = r1.json() if r1.content else {}
            site_name = j.get("name") or j.get("description")
        except Exception:
            site_name = None

        r2 = requests.get(
            f"{base}/wp-json/wp/v2/users/me",
            headers={"Authorization": auth},
            timeout=20,
        )
        r2.raise_for_status()
        user = r2.json() if r2.content else {}
        uname = user.get("username") or user.get("name")
        return WordPressValidateResult(valid=True, site_name=str(site_name) if site_name else None, username=str(uname) if uname else str(username), error=None)
    except Exception as e:
        return WordPressValidateResult(valid=False, site_name=None, username=str(username) if username else None, error=str(e))


def publish_markdown(
    title: str,
    content_markdown: str,
    tags: list[str] | None = None,
    publish: bool = False,
) -> WordPressPublishResult:
    cred = _get_blog_credential("wordpress")
    site_url = cred.get("site_url") or os.getenv("WORDPRESS_SITE_URL")
    username = cred.get("username") or os.getenv("WORDPRESS_USERNAME")
    app_password = cred.get("api_key") or os.getenv("WORDPRESS_APP_PASSWORD")
    enabled = bool(cred.get("enabled")) if "enabled" in cred else True

    if not enabled:
        return WordPressPublishResult(status="disabled", platform_post_id=None, url=None, error="WordPress publishing disabled")
    if not site_url or not username or not app_password:
        return WordPressPublishResult(status="error", platform_post_id=None, url=None, error="Missing WordPress credentials")

    auth = _auth_header(str(username), str(app_password))
    status = "publish" if publish else "draft"
    html = markdown_to_html(content_markdown)

    tag_ids: list[int] = []
    for t in (tags or [])[:10]:
        tid = _ensure_tag(str(site_url), auth, str(t))
        if tid and tid not in tag_ids:
            tag_ids.append(tid)

    payload = {"title": title, "content": html, "status": status}
    if tag_ids:
        payload["tags"] = tag_ids

    try:
        resp = requests.post(
            f"{site_url.rstrip('/')}/wp-json/wp/v2/posts",
            headers={"Authorization": auth, "Content-Type": "application/json"},
            json=payload,
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json() if resp.content else {}
        pid = str(data.get("id")) if data.get("id") is not None else None
        url = data.get("link") or data.get("guid", {}).get("rendered")
        return WordPressPublishResult(status="published" if publish else "draft", platform_post_id=pid, url=url, error=None)
    except Exception as e:
        return WordPressPublishResult(status="error", platform_post_id=None, url=None, error=str(e))
