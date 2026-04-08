from __future__ import annotations

import logging
import time
from typing import List

import requests
from bs4 import BeautifulSoup

from backend.db.session import get_session
from ..models import RawArticle
from sqlalchemy.dialects.postgresql import insert as pg_insert

logger = logging.getLogger("url_fetcher")

# Task 7.4: default URLs no longer overlap with rss_fetcher defaults.
# These are static/non-JS pages not covered by RSS feeds.
# Pass explicit URLs to the constructor for JS-heavy sites.
_DEFAULT_URLS: list[str] = []


def _extract_content(html: str, url: str) -> str:
    """Task 7.3/7.5: use trafilatura for clean article extraction.
    Falls back to <p> tag scraping if trafilatura returns nothing.
    """
    try:
        import trafilatura
        extracted = trafilatura.extract(html, include_comments=False, include_tables=False)
        if extracted:
            return extracted
    except ImportError:
        pass

    # Fallback: <p> tag scraping
    soup = BeautifulSoup(html, "html.parser")
    paragraphs = soup.find_all('p')
    return " ".join(p.get_text().strip() for p in paragraphs)


def _truncate_at_sentence(text: str, max_chars: int = 50000) -> str:
    """Task 7.6: truncate at sentence boundary instead of hard mid-char cut."""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    # Find last sentence-ending punctuation before the limit
    for sep in ('. ', '! ', '? ', '\n'):
        idx = truncated.rfind(sep)
        if idx > max_chars * 0.8:  # only use if we're not losing too much
            return truncated[:idx + 1]
    return truncated


class UrlFetcher:
    """Fetch content from a static list of URLs.

    Intended for static/non-JS pages not covered by RSS feeds.
    For JS-rendered sites (TechCrunch, VentureBeat, The Verge) use rss_fetcher instead.
    """

    def __init__(self, urls: List[str] | None = None) -> None:
        self.urls = urls if urls is not None else list(_DEFAULT_URLS)

    def fetch_urls(self) -> int:
        """Fetch content from the configured URLs and save to DB."""
        inserted_total = 0

        with get_session() as session:
            for url in self.urls:
                resp = None
                # Task 7.2: retry with exponential backoff (3 attempts)
                for attempt in range(3):
                    try:
                        resp = requests.get(
                            url, timeout=10,
                            headers={"User-Agent": "AI-Pulse-Pro/1.0"}
                        )
                        resp.raise_for_status()
                        break
                    except Exception as e:
                        if attempt < 2:
                            wait = 2 * (2 ** attempt)
                            logger.warning("url_retry url=%s attempt=%d error=%s sleeping=%ds",
                                           url, attempt + 1, e, wait)
                            time.sleep(wait)
                        else:
                            logger.warning("url_failed url=%s error=%s", url, e)
                            resp = None

                if resp is None:
                    continue

                soup = BeautifulSoup(resp.text, "html.parser")
                title = soup.title.string.strip() if soup.title else url

                content = _extract_content(resp.text, url)
                content = _truncate_at_sentence(content)

                try:
                    stmt = pg_insert(RawArticle).values(
                        title=title,
                        url=url,
                        source="direct_url",
                        category="General AI",
                        raw_content=content
                    ).on_conflict_do_nothing(index_elements=['url'])
                    result = session.execute(stmt)
                    if result.rowcount > 0:
                        inserted_total += 1
                except Exception as e:
                    logger.warning("insert_failed url=%s error=%s", url, e)

            session.commit()

        return inserted_total


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    my_links = [
        "https://openai.com/blog",
        "https://deepmind.google/discover/blog/"
    ]
    fetcher = UrlFetcher(urls=my_links)
    logger.info("fetching urls=%s", len(my_links))
    inserted = fetcher.fetch_urls()
    logger.info("inserted=%s", inserted)


if __name__ == "__main__":
    main()
