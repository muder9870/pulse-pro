from backend.agents.base_agent import BaseAgent
from backend.fetchers.rss_fetcher import RSSFetcher
from backend.fetchers.arxiv_fetcher import ArxivFetcher
from backend.fetchers.gmail_fetcher_smart import SmartGmailFetcher
from backend.fetchers.github_fetcher import GitHubFetcher
# Task 7.1: removed dead import of UrlFetcher — never used in IngestionAgent.run()
from backend.config import settings
from os import getenv

class IngestionAgent(BaseAgent):
    def __init__(self, db):
        super().__init__("IngestionAgent", db)
        self.rss_fetcher = RSSFetcher()
        self.arxiv_fetcher = ArxivFetcher()
        self.github_fetcher = GitHubFetcher()

    def run(self, sources: list[str] = None):
        self.log(f"Starting ingestion (Sources: {sources or 'all'})")
        results = {"total": 0}
        
        # 1. arXiv
        if not sources or "arxiv" in sources:
            try:
                papers = self.arxiv_fetcher.fetch_latest_papers(max_results=settings.INGEST_CAP_PER_SOURCE)
                inserted = self.arxiv_fetcher.save_to_db(papers)
                results["arxiv"] = inserted
                results["total"] += inserted
                self.log(f"ArXiv complete: {inserted} inserted")
            except Exception as e:
                self.log(f"ArXiv failed: {e}", "error")

        # 2. Gmail
        if not sources or "gmail" in sources:
            email_addr = getenv("GMAIL_ADDRESS")
            app_pw = getenv("GMAIL_APP_PASSWORD")
            if email_addr and app_pw:
                try:
                    gmail = SmartGmailFetcher(email_addr=email_addr, app_password=app_pw)
                    gmail.connect()
                    inserted = gmail.fetch_newsletters()
                    gmail.close()
                    results["gmail"] = inserted
                    results["total"] += inserted
                    self.log(f"Gmail complete: {inserted} inserted")
                except Exception as e:
                    self.log(f"Gmail failed: {e}", "error")

        # 3. GitHub
        if not sources or "github" in sources:
            try:
                inserted = self.github_fetcher.fetch_trending(limit=settings.INGEST_CAP_PER_SOURCE)
                results["github"] = inserted
                results["total"] += inserted
                self.log(f"GitHub complete: {inserted} inserted")
            except Exception as e:
                self.log(f"GitHub failed: {e}", "error")

        # 4. RSS
        if not sources or "rss" in sources:
            try:
                rss_res = self.rss_fetcher.fetch_all_feeds(max_items_per_feed=settings.INGEST_CAP_PER_SOURCE)
                count = sum(rss_res.values())
                results["rss"] = count
                results["total"] += count
                self.log(f"RSS complete: {count} inserted")
            except Exception as e:
                self.log(f"RSS failed: {e}", "error")

        return results
