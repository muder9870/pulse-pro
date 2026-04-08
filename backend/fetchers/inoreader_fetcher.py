from __future__ import annotations

import logging
import time
import requests
from datetime import datetime, timezone
from typing import List, Dict, Any
from urllib.parse import urljoin

from backend.db.session import get_session
from ..models import RawArticle
from ..config import settings
from sqlalchemy.dialects.postgresql import insert as pg_insert


def _retry(func):
    """Task 4.3: simple retry decorator — 3 attempts, exponential backoff."""
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        for attempt in range(3):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                if attempt < 2:
                    wait = 2 * (2 ** attempt)
                    logging.getLogger("inoreader_fetcher").warning(
                        "retry attempt=%d error=%s sleeping=%ds", attempt + 1, e, wait
                    )
                    time.sleep(wait)
                else:
                    raise
    return wrapper


class InoreaderFetcher:
    """Fetcher for Inoreader RSS feeds using their API.

    Authentication note: uses grant_type=password (Resource Owner Password Credentials).
    This grant type is deprecated in OAuth 2.1 and may be disabled by Inoreader in future.
    If authentication breaks, replace with a pre-obtained access token via env var
    INOREADER_ACCESS_TOKEN and skip the authenticate() call entirely.

    Required credentials:
    - INOREADER_APP_ID
    - INOREADER_APP_KEY
    - INOREADER_USERNAME
    - INOREADER_PASSWORD
    """

    def __init__(self, app_id: str, app_key: str, username: str, password: str):
        self.app_id = app_id
        self.app_key = app_key
        self.username = username
        self.password = password
        self.base_url = "https://www.inoreader.com/reader/api/0/"
        self.auth_token = None
        self.log = logging.getLogger("inoreader_fetcher")

    def authenticate(self) -> bool:
        """Authenticate with Inoreader API using password grant (see class docstring)."""
        auth_url = urljoin(self.base_url, "oauth2/token")
        data = {
            "client_id": self.app_id,
            "client_secret": self.app_key,
            "grant_type": "password",  # deprecated in OAuth 2.1 — may break
            "username": self.username,
            "password": self.password,
            "scope": "read"
        }
        try:
            response = requests.post(auth_url, data=data, timeout=30)
            response.raise_for_status()
            auth_data = response.json()
            self.auth_token = auth_data.get("access_token")
            if self.auth_token:
                self.log.info("inoreader_auth_success")
                return True
            else:
                self.log.error("inoreader_auth_failed no_token")
                return False
        except Exception as e:
            self.log.error("inoreader_auth_error error=%s", e)
            return False

    def get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "User-Agent": "AI-Pulse-Pro/1.0"
        }

    @_retry
    def fetch_unread_items(self, max_items: int = 100) -> List[Dict[str, Any]]:
        """Fetch unread items from all subscriptions."""
        if not self.auth_token and not self.authenticate():
            return []

        items_url = urljoin(self.base_url, "stream/contents/user/-/state/com.google/reading-list")
        params = {
            "n": min(max_items, 1000),
            "xt": "user/-/state/com.google/read",
            "output": "json"
        }

        response = requests.get(
            items_url,
            headers=self.get_headers(),
            params=params,
            timeout=60
        )

        # Task 4.1: on 401, re-authenticate once and retry
        if response.status_code == 401:
            self.log.warning("inoreader_token_expired — re-authenticating")
            if self.authenticate():
                response = requests.get(
                    items_url,
                    headers=self.get_headers(),
                    params=params,
                    timeout=60
                )
            else:
                self.log.error("inoreader_reauth_failed")
                return []

        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        self.log.info("inoreader_fetch_success count=%d", len(items))
        return items

    def parse_item(self, item: Dict[str, Any]) -> Dict[str, Any]:
        """Parse Inoreader item into our format."""
        title = item.get("title", "")

        # Task 4.4: guard against canonical[0] missing "href"
        canonical = item.get("canonical", [])
        url = canonical[0].get("href") if canonical else ""
        url = url or ""  # ensure str not None
        if not url:
            alternates = item.get("alternate", [])
            url = (alternates[0].get("href") or "") if alternates else ""

        summary = item.get("summary", {}).get("content", "")
        content = item.get("content", {}).get("content", "")
        raw_content = content or summary

        origin = item.get("origin", {})
        source_title = origin.get("title", "inoreader")

        published = item.get("published", 0)
        fetched_at = datetime.fromtimestamp(published, tz=timezone.utc) if published else datetime.now(timezone.utc)

        category = self._categorize_content(title, raw_content, source_title)

        return {
            "title": title,
            "url": url,
            "source": f"inoreader:{source_title}",
            "category": category,
            "raw_content": raw_content,
            "fetched_at": fetched_at,
        }

    def _categorize_content(self, title: str, content: str, source: str) -> str:
        text = f"{title} {content} {source}".lower()
        if any(kw in text for kw in ["llm", "gpt", "language model", "chatgpt", "claude"]):
            return "LLM"
        elif any(kw in text for kw in ["computer vision", "cv", "image", "visual"]):
            return "Computer Vision"
        elif any(kw in text for kw in ["nlp", "natural language", "text processing"]):
            return "NLP"
        elif any(kw in text for kw in ["robot", "autonomous", "control"]):
            return "Robotics"
        elif any(kw in text for kw in ["machine learning", "deep learning", "neural", "ai"]):
            return "General AI"
        else:
            return "Other"

    def save_to_db(self, articles: List[Dict[str, Any]]) -> int:
        if not articles:
            return 0

        inserted = 0
        with get_session() as session:
            for article in articles:
                # Task 4.5: skip articles with empty url or title
                if not article.get("url") or not article.get("title"):
                    continue
                try:
                    stmt = pg_insert(RawArticle).values(
                        title=article["title"],
                        url=article["url"],
                        source=article["source"],
                        category=article["category"],
                        raw_content=article["raw_content"],
                        fetched_at=article["fetched_at"]
                    ).on_conflict_do_nothing(index_elements=['url'])
                    result = session.execute(stmt)
                    if result.rowcount > 0:
                        inserted += 1
                except Exception as e:
                    self.log.warning("insert_failed title=%s error=%s", article.get("title", "")[:50], e)
            session.commit()

        self.log.info("inoreader_save_complete inserted=%d total=%d", inserted, len(articles))
        return inserted

    def fetch_and_save(self, max_items: int = 100) -> int:
        items = self.fetch_unread_items(max_items)
        if not items:
            return 0
        articles = [self.parse_item(item) for item in items]
        return self.save_to_db(articles)


def main():
    import os
    from dotenv import load_dotenv
    load_dotenv()

    app_id = os.getenv("INOREADER_APP_ID")
    app_key = os.getenv("INOREADER_APP_KEY")
    username = os.getenv("INOREADER_USERNAME")
    password = os.getenv("INOREADER_PASSWORD")

    if not all([app_id, app_key, username, password]):
        print("Missing Inoreader credentials in .env file")
        return

    fetcher = InoreaderFetcher(app_id, app_key, username, password)
    inserted = fetcher.fetch_and_save(max_items=50)
    print(f"Inserted {inserted} new articles from Inoreader")


if __name__ == "__main__":
    main()
