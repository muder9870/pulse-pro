#!/usr/bin/env python3
"""
Fix RSS articles by manually fetching content for tracked items
that didn't make it to raw_articles due to database locks.
"""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RSSFeed, RSSFeedItem, RawArticle
from backend.fetchers.rss_fetcher import RSSFetcher
from sqlalchemy import func
import logging

def fix_rss_articles():
    """Manually fetch RSS content for tracked items."""
    # Set up logging
    logging.basicConfig(level=logging.INFO)
    log = logging.getLogger("fix_rss")
    
    fetcher = RSSFetcher()
    
    with get_session() as session:
        # Get all active RSS feeds
        feeds = session.query(RSSFeed).filter(RSSFeed.active == 1).all()
        
        log.info(f"Found {len(feeds)} active RSS feeds")
        
        total_processed = 0
        
        for feed in feeds:
            try:
                # Clear the tracking for this feed to allow re-processing
                session.query(RSSFeedItem).filter(
                    RSSFeedItem.feed_id == feed.id
                ).delete()
                session.commit()
                
                # Fetch fresh content
                new_items = fetcher.fetch_feed(feed.id, max_items=10)  # Limit to 10 items per feed
                
                if new_items > 0:
                    log.info(f"Processed {new_items} items from {feed.title}")
                    total_processed += new_items
                else:
                    log.info(f"No new items from {feed.title}")
                    
            except Exception as e:
                log.error(f"Failed to process feed {feed.title}: {e}")
        
        log.info(f"Total articles processed: {total_processed}")
        
        # Check final counts
        rss_count = session.query(func.count(RawArticle.id)).filter(
            RawArticle.source.like('rss:%')
        ).scalar()
        log.info(f"RSS articles now in database: {rss_count}")

if __name__ == "__main__":
    fix_rss_articles()