from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import re

from backend.config import settings


@dataclass
class LocalPublishResult:
    status: str
    platform_post_id: str | None
    url: str | None
    error: str | None


def _safe_slug(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9\-]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s or "post"


def publish_markdown(title: str, content_markdown: str, slug: str | None = None) -> LocalPublishResult:
    try:
        base_dir = Path(settings.DB_PATH).parent / "published_blog"
        base_dir.mkdir(parents=True, exist_ok=True)

        ts = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        name = f"{_safe_slug(slug or title)}-{ts}.md"
        path = base_dir / name
        path.write_text(content_markdown or "", encoding="utf-8")
        return LocalPublishResult(status="draft", platform_post_id=name, url=f"/api/blog/local/{name}", error=None)
    except Exception as e:
        return LocalPublishResult(status="error", platform_post_id=None, url=None, error=str(e))


def validate_credentials() -> tuple[bool, str | None]:
    return True, None

