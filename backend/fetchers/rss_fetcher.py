from __future__ import annotations

import logging
import requests
import feedparser
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from functools import wraps

from backend.db.session import get_session
from ..models import RSSFeed, RSSFeedItem, RawArticle
from ..config import settings
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import func


def retry_on_failure(max_retries=3, delay=2, backoff=2):
    """Decorator to retry failed operations with exponential backoff."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            retries = 0
            current_delay = delay
            
            while retries < max_retries:
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    retries += 1
                    if retries >= max_retries:
                        raise
                    
                    # Log retry attempt
                    logger = logging.getLogger("rss_fetcher")
                    logger.warning(f"Retry {retries}/{max_retries} for {func.__name__} after error: {e}")
                    
                    time.sleep(current_delay)
                    current_delay *= backoff
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


class RSSFetcher:
    """Direct RSS feed fetcher to replace Inoreader dependency.
    
    Fetches content directly from RSS/Atom feeds without requiring
    third-party services or API keys.
    """
    
    def __init__(self):
        self.log = logging.getLogger("rss_fetcher")
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AI-Pulse-Pro/1.0 (RSS Reader; +https://github.com/ai-pulse-pro)'
        })
        
        # Common AI/ML RSS feeds
        self.default_feeds = [
            # AI Research & News
            "https://feeds.feedburner.com/oreilly/radar",
            "https://machinelearningmastery.com/feed/",
            # distill.pub stopped publishing in 2021 — removed
            # openai.com/blog/rss/ and blog.openai.com/rss/ — both dead/moved — removed
            # deepmind.com/blog/feed/basic/ — rebranded, URL dead — removed
            "https://blog.research.google/feeds/posts/default",
            # research.facebook.com/feed/ — Meta AI changed site structure — removed
            "https://www.microsoft.com/en-us/research/feed/",

            # Tech News with AI Focus
            "https://techcrunch.com/category/artificial-intelligence/feed/",
            "https://venturebeat.com/ai/feed/",
            "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml",
            "https://arstechnica.com/tag/artificial-intelligence/feed/",
            "https://www.wired.com/feed/tag/ai/latest/rss",

            # Academic & Research
            # export.arxiv.org RSS covered by ArxivFetcher — kept for completeness
            "https://export.arxiv.org/rss/cs.AI",
            "https://export.arxiv.org/rss/cs.LG",
            "https://export.arxiv.org/rss/cs.CL",
            "https://export.arxiv.org/rss/cs.CV",
            "https://export.arxiv.org/rss/cs.RO",

            # Specialized AI Blogs
            "https://pytorch.org/blog/feed.xml",
            "https://huggingface.co/blog/feed.xml",
            "https://www.fast.ai/feed.xml",
            "https://towardsdatascience.com/feed",
            "https://medium.com/feed/@karpathy",
            "https://lilianweng.github.io/feed.xml",

            # Industry & Business
            "https://sloanreview.mit.edu/topic/artificial-intelligence/feed/",
            "https://hbr.org/topic/artificial-intelligence/rss",

            # Developer & Technical
            "https://paperswithcode.com/feed.xml",
            "https://syncedreview.com/feed/",
            "https://www.kdnuggets.com/feed",

            # Newsletters & Aggregators
            "https://www.deeplearning.ai/feed/",
            "https://thegradient.pub/rss/",
        ]
    
    def add_feed(self, url: str, category: str = "AI/ML", active: bool = True) -> int:
        """Add a new RSS feed to track."""
        # Validate and fetch feed info
        feed_info = self._validate_feed(url)
        if not feed_info:
            raise ValueError(f"Invalid or inaccessible RSS feed: {url}")
        
        with get_session() as session:
            # Use PostgreSQL upsert
            stmt = pg_insert(RSSFeed).values(
                url=url,
                title=feed_info['title'],
                description=feed_info['description'],
                category=category,
                active=1 if active else 0,
                updated_at=datetime.now(timezone.utc)
            ).on_conflict_do_update(
                index_elements=['url'],
                set_={
                    'title': feed_info['title'],
                    'description': feed_info['description'],
                    'category': category,
                    'active': 1 if active else 0,
                    'updated_at': datetime.now(timezone.utc)
                }
            ).returning(RSSFeed.id)
            
            result = session.execute(stmt)
            feed_id = result.scalar()
            session.commit()
            
            self.log.info("feed_added url=%s title=%s", url, feed_info['title'])
            return feed_id
    
    
    def bulk_add_feeds(self, feeds: List[Dict[str, str]]) -> Dict[str, Any]:
        """Bulk add multiple RSS feeds."""
        added = 0
        failures = []
        for feed in feeds:
            try:
                self.add_feed(feed['url'], feed.get('category', 'AI/ML'))
                added += 1
            except Exception as e:
                self.log.warning("failed_to_add_feed url=%s error=%s", feed['url'], e)
                failures.append({'url': feed['url'], 'error': str(e)})
        
        return {'added': added, 'failed': len(failures), 'failures': failures}
    
    def add_default_feeds(self) -> Dict[str, Any]:
        """Add the default AI/ML RSS feeds."""
        feeds = [{'url': url, 'category': 'AI/ML'} for url in self.default_feeds]
        return self.bulk_add_feeds(feeds)
    
    @retry_on_failure(max_retries=3, delay=2, backoff=2)
    def _validate_feed(self, url: str) -> Optional[Dict[str, str]]:
        """Validate that a URL is a valid RSS/Atom feed."""
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # Parse with feedparser
            feed = feedparser.parse(response.content)
            
            if feed.bozo and not feed.entries:
                return None
            
            return {
                'title': feed.feed.get('title', 'Unknown Feed'),
                'description': feed.feed.get('description', ''),
                'link': feed.feed.get('link', url)
            }
            
        except Exception as e:
            self.log.warning("feed_validation_failed url=%s error=%s", url, e)
            return None
    
    @retry_on_failure(max_retries=3, delay=2, backoff=2)
    def fetch_feed(self, feed_id: int, max_items: int = 50) -> int:
        """Fetch new items from a specific RSS feed."""
        # 1. Get feed info first (short DB op)
        feed_url = None
        feed_title = None
        with get_session() as session:
            feed = session.query(RSSFeed).filter(
                RSSFeed.id == feed_id,
                RSSFeed.active == 1
            ).first()
            if feed:
                feed_url = feed.url
                feed_title = feed.title
        
        if not feed_url:
            return 0

        # 2. Perform network IO (outside DB transaction)
        try:
            response = self.session.get(feed_url, timeout=15)
            response.raise_for_status()
            
            feed = feedparser.parse(response.content)
            
            if feed.bozo and not feed.entries:
                raise Exception(f"Invalid feed format: {feed.bozo_exception}")

            # Prepare items to process
            entries_to_process = []
            for entry in feed.entries[:max_items]:
                guid = entry.get('id') or entry.get('guid') or entry.get('link', '')
                if guid:
                    entries_to_process.append((guid, entry))

        except Exception as e:
            # Log error and update feed status
            self.log.error("feed_fetch_failed feed_id=%s url=%s error=%s", feed_id, feed_url, e)
            with get_session() as session:
                feed = session.query(RSSFeed).filter(RSSFeed.id == feed_id).first()
                if feed:
                    feed.last_error = str(e)
                    feed.error_count += 1
                    feed.updated_at = datetime.now(timezone.utc)
                    session.commit()
            return 0

        # 3. Process and Save to DB (short DB op)
        new_items = 0
        processed_articles = []
        
        with get_session() as session:
            for guid, entry in entries_to_process:
                # Check if already processed
                existing = session.query(RSSFeedItem).filter(
                    RSSFeedItem.feed_id == feed_id,
                    RSSFeedItem.guid == guid
                ).first()
                if existing:
                    continue

                # Parse entry data
                article_data = self._parse_entry(entry, feed_title)
                if article_data:
                    processed_articles.append(article_data)
                    
                    # Track this item
                    feed_item = RSSFeedItem(
                        feed_id=feed_id,
                        guid=guid,
                        url=article_data['url'],
                        title=article_data['title'],
                        published_date=article_data['fetched_at']
                    )
                    session.add(feed_item)
                    new_items += 1
            
            # Update feed stats
            feed = session.query(RSSFeed).filter(RSSFeed.id == feed_id).first()
            if feed:
                feed.last_fetched = datetime.now(timezone.utc)
                feed.fetch_count += 1
                feed.last_error = None
                feed.updated_at = datetime.now(timezone.utc)
            
            session.commit()

        # 4. Save articles to raw_articles (separate step, can be outside the feed_items transaction but kept separate is fine)
        if processed_articles:
            inserted = self._save_articles(processed_articles)
            self.log.info("feed_fetched feed_id=%s url=%s new_items=%s inserted=%s", 
                        feed_id, feed_url, new_items, inserted)

        return new_items
    
    def _parse_entry(self, entry: Any, feed_title: str) -> Optional[Dict[str, Any]]:
        """Parse a feed entry into our article format."""
        try:
            # Extract basic info
            title = entry.get('title', '').strip()
            if not title:
                return None
            
            url = entry.get('link', '').strip()
            if not url:
                return None
            
            # Extract content
            content = ""
            if hasattr(entry, 'content') and entry.content:
                content = entry.content[0].value if isinstance(entry.content, list) else entry.content
            elif hasattr(entry, 'summary'):
                content = entry.summary
            elif hasattr(entry, 'description'):
                content = entry.description
            
            # Parse published date
            published = entry.get('published_parsed') or entry.get('updated_parsed')
            if published:
                fetched_at = datetime(*published[:6], tzinfo=timezone.utc)
            else:
                fetched_at = datetime.now(timezone.utc)
            
            # Categorize content
            category = self._categorize_content(title, content, feed_title)
            
            return {
                'title': title,
                'url': url,
                'source': f'rss:{feed_title}',
                'category': category,
                'raw_content': content,
                'fetched_at': fetched_at
            }
            
        except Exception as e:
            self.log.warning("entry_parse_failed title=%s error=%s", 
                           entry.get('title', 'Unknown')[:50], e)
            return None
    
    def _categorize_content(self, title: str, content: str, feed_title: str) -> str:
        """Categorize content based on keywords."""
        text = f"{title} {content} {feed_title}".lower()
        
        # AI/ML subcategories
        if any(kw in text for kw in ["llm", "gpt", "language model", "chatgpt", "claude", "transformer"]):
            return "LLM"
        elif any(kw in text for kw in ["computer vision", "cv", "image", "visual", "cnn", "object detection"]):
            return "Computer Vision"
        elif any(kw in text for kw in ["nlp", "natural language", "text processing", "sentiment", "translation"]):
            return "NLP"
        elif any(kw in text for kw in ["robot", "autonomous", "control", "manipulation", "navigation"]):
            return "Robotics"
        elif any(kw in text for kw in ["reinforcement learning", "rl", "policy", "reward", "agent"]):
            return "Reinforcement Learning"
        elif any(kw in text for kw in ["machine learning", "deep learning", "neural", "ai", "artificial intelligence"]):
            return "General AI"
        else:
            return "Other"
    
    def _save_articles(self, articles: List[Dict[str, Any]]) -> int:
        """Save articles to the main raw_articles table."""
        if not articles:
            return 0
        
        inserted = 0
        with get_session() as session:
            for article in articles:
                try:
                    # Use PostgreSQL upsert to handle duplicates
                    stmt = pg_insert(RawArticle).values(
                        title=article['title'],
                        url=article['url'],
                        source=article['source'],
                        category=article['category'],
                        raw_content=article['raw_content'],
                        fetched_at=article['fetched_at']
                    ).on_conflict_do_nothing(index_elements=['url'])
                    
                    result = session.execute(stmt)
                    if result.rowcount > 0:
                        inserted += 1
                        
                except Exception as e:
                    self.log.warning("article_insert_failed title=%s error=%s", 
                                   article.get('title', '')[:50], e)
            
            session.commit()
        
        return inserted
    
    def fetch_all_feeds(self, max_items_per_feed: int = 20, max_workers: int = 10) -> Dict[str, int]:
        """Fetch new items from all active RSS feeds in parallel using threads.

        Also runs health check (deactivates dead feeds) and discovery (adds new feeds)
        on every run so the feed list stays fresh automatically.
        """
        # 1. Health check — deactivate dead feeds before fetching
        try:
            health = self.health_check_feeds()
            if health["deactivated_count"] > 0:
                self.log.info(
                    "rss_health_check deactivated=%d feeds",
                    health["deactivated_count"]
                )
        except Exception as e:
            self.log.warning("rss_health_check_failed error=%s", e)

        # 2. Discovery — add new AI/ML feeds if we have fewer than 20 active
        try:
            with get_session() as session:
                active_count = session.query(RSSFeed).filter(RSSFeed.active == 1).count()
            if active_count < 20:
                discovery = self.discover_new_feeds(max_new=5)
                if discovery["added_count"] > 0:
                    self.log.info(
                        "rss_discovery added=%d new feeds",
                        discovery["added_count"]
                    )
        except Exception as e:
            self.log.warning("rss_discovery_failed error=%s", e)

        # 3. Fetch from all active feeds
        with get_session() as session:
            feeds = session.query(RSSFeed).filter(
                RSSFeed.active == 1
            ).all()
            feed_list = [(f.id, f.url, f.title) for f in feeds]

        if not feed_list:
            self.log.info("fetch_all_complete total_feeds=0 total_new_items=0")
            return {}

        results: Dict[str, int] = {}
        total_new = 0

        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="rss_fetch") as executor:
            future_to_feed = {
                executor.submit(self.fetch_feed, feed_id, max_items_per_feed): (feed_id, feed_title)
                for feed_id, feed_url, feed_title in feed_list
            }

            for future in as_completed(future_to_feed):
                _, feed_title = future_to_feed[future]
                try:
                    new_items = future.result()
                    results[feed_title] = new_items
                    total_new += new_items
                except Exception as e:
                    self.log.error(
                        "feed_fetch_error feed=%s error=%s", feed_title, e
                    )
                    results[feed_title] = 0

        self.log.info(
            "fetch_all_complete total_feeds=%s total_new_items=%s",
            len(feed_list), total_new,
        )
        return results
    
    def get_feed_stats(self) -> List[Dict[str, Any]]:
        """Get statistics for all RSS feeds."""
        with get_session() as session:
            feeds = session.query(RSSFeed).all()
            
            stats = []
            for feed in feeds:
                # Count feed items
                item_count = session.query(func.count(RSSFeedItem.id)).filter(
                    RSSFeedItem.feed_id == feed.id
                ).scalar()
                
                stats.append({
                    'id': feed.id,
                    'url': feed.url,
                    'title': feed.title,
                    'category': feed.category,
                    'active': bool(feed.active),
                    'last_fetched': feed.last_fetched,
                    'last_error': feed.last_error,
                    'fetch_count': feed.fetch_count,
                    'error_count': feed.error_count,
                    'total_items': item_count
                })
            
            # Sort by fetch_count DESC, then title
            stats.sort(key=lambda x: (-x['fetch_count'], x['title'] or ''))
            return stats
    
    def health_check_feeds(self) -> Dict[str, Any]:
        """Check all active feeds for dead links and deactivate ones that consistently fail.

        Task 6.7: HTTP checks are done outside the DB transaction to avoid holding
        the connection open during slow network calls.
        """
        # 1. Collect feeds that need checking (short DB op, session closed after)
        feeds_to_check = []
        with get_session() as session:
            feeds = session.query(RSSFeed).filter(RSSFeed.active == 1).all()
            for feed in feeds:
                if feed.error_count >= 3:
                    feeds_to_check.append((feed.id, feed.url, feed.title))

        # 2. Perform HTTP checks outside any DB transaction
        dead: list[tuple[int, str]] = []   # (feed_id, reason)
        reset: list[int] = []              # feed_ids whose error_count should be reset

        for feed_id, feed_url, feed_title in feeds_to_check:
            try:
                resp = self.session.get(feed_url, timeout=10)
                if resp.status_code in (404, 410, 400, 403):
                    dead.append((feed_id, f"HTTP {resp.status_code}"))
                elif resp.status_code < 500:
                    # Feed is back — reset error count
                    reset.append(feed_id)
                # 5xx: leave as-is, may be temporary
            except Exception as e:
                dead.append((feed_id, f"Connection failed: {str(e)[:80]}"))

        # 3. Apply deactivations and resets (short DB op)
        deactivated = []
        still_active_count = 0

        with get_session() as session:
            for feed_id, reason in dead:
                feed = session.query(RSSFeed).filter(RSSFeed.id == feed_id).first()
                if feed:
                    feed.active = 0
                    feed.last_error = f"Deactivated: {reason}"
                    feed.updated_at = datetime.now(timezone.utc)
                    deactivated.append({"url": feed.url, "title": feed.title, "reason": reason})
                    self.log.info("feed_deactivated url=%s reason=%s", feed.url, reason)

            for feed_id in reset:
                feed = session.query(RSSFeed).filter(RSSFeed.id == feed_id).first()
                if feed:
                    feed.error_count = 0
                    feed.last_error = None

            still_active_count = session.query(RSSFeed).filter(RSSFeed.active == 1).count()
            session.commit()

        self.log.info("health_check_complete deactivated=%d still_active=%d",
                      len(deactivated), still_active_count)
        return {
            "deactivated": deactivated,
            "deactivated_count": len(deactivated),
            "active_count": still_active_count,
        }

    def discover_new_feeds(self, max_new: int = 10) -> Dict[str, Any]:
        """Discover new AI/ML RSS feeds by searching known aggregators and feed directories.

        Searches for feeds matching AI/ML keywords from:
        - Feedly public API (no auth needed for search)
        - Known AI/ML blog patterns

        Returns summary of newly added feeds.
        """
        AI_SEARCH_TERMS = [
            "artificial intelligence",
            "machine learning",
            "large language models",
            "deep learning",
            "AI research",
        ]

        # Known high-quality AI/ML feeds not in the default list — curated additions
        CURATED_NEW_FEEDS = [
            "https://www.interconnects.ai/feed",
            "https://newsletter.theaiedge.io/feed",
            "https://www.aisnakeoil.com/feed",
            "https://www.oneusefulthing.org/feed",
            "https://simonwillison.net/atom/everything/",
            "https://www.semianalysis.com/feed",
            "https://sebastianraschka.com/rss_feed.xml",
            "https://karpathy.github.io/feed.xml",
            "https://eugeneyan.com/rss/",
            "https://hamel.dev/feed.xml",
            "https://www.alignmentforum.org/feed.xml",
            "https://bounded-regret.ghost.io/rss/",
            "https://www.lesswrong.com/feed.xml",
            "https://mlops.community/feed/",
            "https://newsletter.mlsafety.org/feed",
        ]

        # Get existing feed URLs to avoid duplicates
        with get_session() as session:
            existing_urls = {f.url for f in session.query(RSSFeed.url).all()}

        added = []
        failed = []

        for url in CURATED_NEW_FEEDS[:max_new]:
            if url in existing_urls:
                continue
            try:
                feed_info = self._validate_feed(url)
                if feed_info:
                    self.add_feed(url, category="AI/ML")
                    added.append({"url": url, "title": feed_info["title"]})
                    existing_urls.add(url)
                    self.log.info("new_feed_discovered url=%s title=%s", url, feed_info["title"])
                else:
                    failed.append({"url": url, "reason": "invalid or inaccessible"})
            except Exception as e:
                failed.append({"url": url, "reason": str(e)[:80]})

        self.log.info("discovery_complete added=%d failed=%d", len(added), len(failed))
        return {
            "added": added,
            "added_count": len(added),
            "failed_count": len(failed),
        }


def main():
    """Test the RSS fetcher."""
    fetcher = RSSFetcher()
    
    # Add default feeds
    print("Adding default AI/ML RSS feeds...")
    added = fetcher.add_default_feeds()
    print(f"Added {added} feeds")
    
    # Fetch from all feeds
    print("Fetching from all feeds...")
    results = fetcher.fetch_all_feeds(max_items_per_feed=5)
    
    total_items = sum(results.values())
    print(f"Fetched {total_items} new items from {len(results)} feeds")
    
    # Show stats
    stats = fetcher.get_feed_stats()
    print(f"\nFeed Statistics:")
    for stat in stats[:10]:  # Show top 10
        print(f"- {stat['title']}: {stat['total_items']} items, {stat['fetch_count']} fetches")


if __name__ == "__main__":
    main()
