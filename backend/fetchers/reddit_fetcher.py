from __future__ import annotations

import logging
import time
from typing import Iterable

import praw

# Task 5.5: removed unused `from ..config import settings`
from backend.db.session import get_session
from ..models import RawArticle
from sqlalchemy.dialects.postgresql import insert as pg_insert

logger = logging.getLogger("reddit_fetcher")


class RedditFetcher:
    """Fetch top posts from AI subreddits and store into raw_articles."""

    def __init__(self, client_id: str, client_secret: str, user_agent: str) -> None:
        self.reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            user_agent=user_agent,
        )

    def fetch_top_posts(self, subreddits: Iterable[str], limit: int = 25) -> int:
        posts_data = []

        for sub in subreddits:
            # Task 5.4: per-subreddit try/except so one failure doesn't abort the rest
            try:
                subreddit = self.reddit.subreddit(sub)
                for post in subreddit.hot(limit=limit):
                    posts_data.append({
                        "title": post.title.strip(),
                        "url": post.url,
                        "source": "reddit",
                        "category": sub,
                        "raw_content": post.selftext or None
                    })
            except Exception as e:
                # Task 5.1: use logger instead of print
                logger.error("fetch_failed subreddit=%s error=%s", sub, e)
                continue

            # Task 5.3: delay between subreddits to respect rate limits
            time.sleep(1)

        if not posts_data:
            return 0

        inserted_total = 0
        with get_session() as session:
            for p in posts_data:
                try:
                    stmt = pg_insert(RawArticle).values(
                        title=p["title"],
                        url=p["url"],
                        source="reddit",
                        category=p["category"],
                        raw_content=p["raw_content"]
                    ).on_conflict_do_nothing(index_elements=['url'])
                    result = session.execute(stmt)
                    if result.rowcount > 0:
                        inserted_total += 1
                except Exception as e:
                    # Task 5.2: log instead of silent pass
                    logger.warning("insert_failed url=%s error=%s", p["url"], e)

            session.commit()

        return inserted_total


def main() -> None:
    from os import getenv

    client_id = getenv("REDDIT_CLIENT_ID")
    client_secret = getenv("REDDIT_CLIENT_SECRET")
    user_agent = getenv("REDDIT_USER_AGENT", "ai-pulse-pro/0.1")

    if not client_id or not client_secret:
        print("[reddit_fetcher] Skipping: REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not set.")
        return

    subreddits = ["MachineLearning", "ArtificialIntelligence"]
    fetcher = RedditFetcher(client_id=client_id, client_secret=client_secret, user_agent=user_agent)
    print("[reddit_fetcher] Fetching top posts from Reddit...")
    inserted = fetcher.fetch_top_posts(subreddits=subreddits, limit=25)
    print(f"[reddit_fetcher] Inserted {inserted} new rows into raw_articles.")


if __name__ == "__main__":
    main()
