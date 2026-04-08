from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterable, List
from urllib.parse import urlencode

import requests
import xml.etree.ElementTree as ET

logger = logging.getLogger(__name__)

ARXIV_API_BASE = "http://export.arxiv.org/api/query"


@dataclass
class ArxivPaper:
    title: str
    url: str
    source: str = "arxiv"
    category: str | None = None
    raw_content: str | None = None


class ArxivFetcher:
    """Fetch latest AI-related papers from arXiv and store into raw_articles.

    Uses the official arXiv API via HTTP + XML parsing.
    No external arxiv/feedparser dependency.
    """

    def __init__(self, categories: Iterable[str] | None = None, delay_seconds: int = 3) -> None:
        if categories is None:
            categories = ["cs.AI", "cs.LG", "cs.CV", "cs.CL"]
        self.categories: List[str] = list(categories)
        self.delay_seconds = delay_seconds

    def _build_url(self, category: str, max_results: int) -> str:
        params = {
            "search_query": f"cat:{category}",
            "sortBy": "submittedDate",
            "sortOrder": "descending",
            "max_results": str(max_results),
        }
        return f"{ARXIV_API_BASE}?{urlencode(params)}"

    def fetch_latest_papers(self, max_results: int = 50) -> list[ArxivPaper]:
        """Fetch latest papers from configured arXiv categories."""
        papers: list[ArxivPaper] = []

        for i, category in enumerate(self.categories):
            if i > 0 and self.delay_seconds > 0:
                time.sleep(self.delay_seconds)

            url = self._build_url(category, max_results)

            # Task 1.1: retry with exponential backoff (3 attempts, 2s base)
            resp = None
            for attempt in range(3):
                try:
                    resp = requests.get(url, timeout=15)
                    resp.raise_for_status()
                    break
                except Exception as e:
                    if attempt < 2:
                        wait = 2 * (2 ** attempt)
                        logger.warning("arxiv_retry category=%s attempt=%d error=%s sleeping=%ds",
                                       category, attempt + 1, e, wait)
                        time.sleep(wait)
                    else:
                        logger.error("arxiv_failed category=%s error=%s", category, e)
                        resp = None

            if resp is None:
                continue

            # arXiv returns Atom XML
            root = ET.fromstring(resp.text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}

            for entry in root.findall("atom:entry", ns):
                title_el = entry.find("atom:title", ns)
                summary_el = entry.find("atom:summary", ns)
                id_el = entry.find("atom:id", ns)

                title = (title_el.text or "").strip() if title_el is not None else ""
                summary = (summary_el.text or "").strip() if summary_el is not None else None

                pdf_url = None
                for link in entry.findall("atom:link", ns):
                    if link.get("type") == "application/pdf":
                        pdf_url = link.get("href")
                        break

                url_val = pdf_url or (id_el.text.strip() if id_el is not None and id_el.text else "")

                if not title or not url_val:
                    continue

                papers.append(
                    ArxivPaper(
                        title=title,
                        url=url_val,
                        category=category,
                        raw_content=summary,
                    )
                )

        return papers

    def save_to_db(self, papers: Iterable[ArxivPaper]) -> int:
        """Save papers into raw_articles table using PostgreSQL upsert."""
        from backend.db.session import get_session
        from ..models import RawArticle
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        # Task 1.2: removed unused `from sqlalchemy import inspect`
        # Task 1.3: removed SQLite dialect branching — repo is PostgreSQL-only

        inserted = 0
        with get_session() as session:
            for p in papers:
                stmt = pg_insert(RawArticle).values(
                    title=p.title, url=p.url, source=p.source,
                    category=p.category, raw_content=p.raw_content
                ).on_conflict_do_nothing(index_elements=['url'])
                res = session.execute(stmt)
                if res.rowcount > 0:
                    inserted += 1
            session.commit()
        return inserted


def main() -> None:
    """CLI entrypoint for manual testing."""
    print("[arxiv_fetcher] Fetching latest papers from arXiv via HTTP API...")
    fetcher = ArxivFetcher()
    papers = fetcher.fetch_latest_papers(max_results=10)
    print(f"[arxiv_fetcher] Fetched {len(papers)} papers, saving to DB...")
    inserted = fetcher.save_to_db(papers)
    print(f"[arxiv_fetcher] Inserted {inserted} new rows into raw_articles.")


if __name__ == "__main__":
    main()
