#!/usr/bin/env python3
"""
Simple RSS test that directly inserts articles without complex tracking.
"""

import requests
import feedparser
from datetime import datetime, timezone
from backend.database import get_connection, init_db

def simple_rss_fetch():
    """Simple RSS fetch without complex tracking."""
    init_db()
    
    # Test with a simple RSS feed
    test_url = "https://rss.cnn.com/rss/edition.rss"
    
    print(f"Fetching from: {test_url}")
    
    try:
        # Fetch RSS content
        response = requests.get(test_url, timeout=10)
        response.raise_for_status()
        
        # Parse feed
        feed = feedparser.parse(response.content)
        
        print(f"Found {len(feed.entries)} entries")
        
        # Insert directly into raw_articles
        inserted = 0
        with get_connection() as conn:
            cur = conn.cursor()
            
            for entry in feed.entries[:5]:  # Limit to 5 items
                title = entry.get('title', '').strip()
                url = entry.get('link', '').strip()
                
                if not title or not url:
                    continue
                
                # Get content
                content = ""
                if hasattr(entry, 'summary'):
                    content = entry.summary
                elif hasattr(entry, 'description'):
                    content = entry.description
                
                # Insert directly
                try:
                    cur.execute("""
                        INSERT OR IGNORE INTO raw_articles 
                        (title, url, source, category, raw_content, fetched_at)
                        VALUES (?, ?, ?, ?, ?, ?)
                    """, (
                        title,
                        url,
                        "rss:O'Reilly Radar",
                        "AI/ML",
                        content,
                        datetime.now(timezone.utc)
                    ))
                    
                    if cur.rowcount > 0:
                        inserted += 1
                        print(f"Inserted: {title[:50]}...")
                        
                except Exception as e:
                    print(f"Failed to insert {title[:30]}: {e}")
            
            conn.commit()
        
        print(f"Successfully inserted {inserted} articles")
        
        # Check total RSS articles
        with get_connection() as conn:
            cur = conn.cursor()
            cur.execute('SELECT COUNT(*) FROM raw_articles WHERE source LIKE ?', ('rss:%',))
            total = cur.fetchone()[0]
            print(f"Total RSS articles in database: {total}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    simple_rss_fetch()