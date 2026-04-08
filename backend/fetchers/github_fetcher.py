from __future__ import annotations

import base64
import logging
import time
from typing import Optional

import requests

from ..config import settings

logger = logging.getLogger(__name__)

# AI/ML topics and keywords to search GitHub for
AI_TOPICS = [
    "large-language-models",
    "llm",
    "generative-ai",
    "machine-learning",
    "deep-learning",
    "artificial-intelligence",
    "transformer",
    "diffusion-model",
    "reinforcement-learning",
    "computer-vision",
    "natural-language-processing",
    "ai-agents",
    "rag",
    "fine-tuning",
]

# Minimum stars to filter out low-quality repos
MIN_STARS = 50


class GitHubFetcher:
    """Fetch AI/ML-focused GitHub repos using the Search API with topic keywords."""

    SEARCH_URL = "https://api.github.com/search/repositories"
    README_URL = "https://api.github.com/repos/{full_name}/readme"

    def __init__(self) -> None:
        self.token: Optional[str] = getattr(settings, "GITHUB_TOKEN", None)
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.token:
            self.headers["Authorization"] = f"Bearer {self.token}"

    def _get(self, url: str, params: dict | None = None) -> dict | None:
        try:
            resp = requests.get(url, headers=self.headers, params=params, timeout=15)
            # Task 2.3: handle both 403 (rate limit) and 429 (secondary rate limit)
            if resp.status_code in (403, 429):
                logger.warning("GitHub rate limit hit (HTTP %d) — sleeping 60s", resp.status_code)
                time.sleep(60)
                resp = requests.get(url, headers=self.headers, params=params, timeout=15)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.error("GitHub API error url=%s error=%s", url, e)
            return None

    def _fetch_readme(self, full_name: str) -> str:
        """Fetch and decode the README for a repo. Returns empty string on failure."""
        data = self._get(self.README_URL.format(full_name=full_name))
        if not data or "content" not in data:
            return ""
        try:
            content = base64.b64decode(data["content"]).decode("utf-8", errors="ignore")
            return content[:2000].strip()
        except Exception:
            return ""

    def fetch_trending(self, limit: int = 50) -> int:
        """Search GitHub for trending AI/ML repos and store them with README content."""
        repos_data = []
        seen_urls: set[str] = set()
        per_topic = max(1, limit // len(AI_TOPICS))

        for topic in AI_TOPICS:
            if len(repos_data) >= limit:
                break

            query = f"topic:{topic} stars:>={MIN_STARS}"
            params = {
                "q": query,
                "sort": "updated",
                "order": "desc",
                "per_page": min(per_topic, 10),
            }

            data = self._get(self.SEARCH_URL, params=params)
            if not data or "items" not in data:
                continue

            for repo in data["items"]:
                if len(repos_data) >= limit:
                    break

                url = repo.get("html_url", "")
                if not url or url in seen_urls:
                    continue
                seen_urls.add(url)

                full_name = repo.get("full_name", "")
                description = repo.get("description") or ""
                stars = repo.get("stargazers_count", 0)
                language = repo.get("language") or ""
                topics = ", ".join(repo.get("topics", []))

                readme = self._fetch_readme(full_name)
                # Task 2.4: delay after each README fetch to avoid secondary rate limits
                time.sleep(0.5)

                raw_content_parts = [
                    f"Repository: {full_name}",
                    f"Stars: {stars:,}",
                    f"Language: {language}" if language else "",
                    f"Topics: {topics}" if topics else "",
                    f"Description: {description}" if description else "",
                    "",
                    "README:",
                    readme if readme else "(no README available)",
                ]
                raw_content = "\n".join(p for p in raw_content_parts if p is not None)
                title = f"{full_name} — {description}" if description else full_name

                repos_data.append({
                    "title": title,
                    "url": url,
                    "category": topic,
                    "raw_content": raw_content,
                    "stars": stars,
                })

            time.sleep(1)

        if not repos_data:
            logger.warning("GitHub fetcher: no repos found")
            return 0

        repos_data.sort(key=lambda r: r["stars"], reverse=True)

        from backend.db.session import get_session
        from ..models import RawArticle
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        inserted_total = 0
        with get_session() as session:
            for r in repos_data:
                try:
                    stmt = pg_insert(RawArticle).values(
                        title=r["title"],
                        url=r["url"],
                        source="github",
                        category=r["category"],
                        raw_content=r["raw_content"],
                    ).on_conflict_do_nothing(index_elements=["url"])
                    result = session.execute(stmt)
                    if result.rowcount > 0:
                        inserted_total += 1
                except Exception as e:
                    logger.warning("Failed to insert repo %s: %s", r["url"], e)
            # Task 2.5: explicit commit
            session.commit()

        logger.info("GitHub fetch complete: %d new repos inserted", inserted_total)
        return inserted_total


def main() -> None:
    fetcher = GitHubFetcher()
    print("[github_fetcher] Fetching AI/ML repos from GitHub...")
    inserted = fetcher.fetch_trending(limit=50)
    print(f"[github_fetcher] Inserted {inserted} new rows into raw_articles.")


if __name__ == "__main__":
    main()
