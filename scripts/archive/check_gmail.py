#!/usr/bin/env python3
"""Check Gmail fetcher status and articles using PostgreSQL and ORM."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RawArticle
from sqlalchemy import func

print("=" * 60)
print("GMAIL FETCHER STATUS CHECK")
print("=" * 60)

try:
    with get_session() as session:
        # Check Gmail articles
        gmail_count = session.query(func.count(RawArticle.id)).filter(
            RawArticle.source == 'gmail'
        ).scalar()
        print(f"\n📧 Gmail Articles in Database: {gmail_count}")

        if gmail_count > 0:
            print("\n📝 Recent Gmail Articles:")
            articles = session.query(
                RawArticle.title,
                RawArticle.fetched_at
            ).filter(
                RawArticle.source == 'gmail'
            ).order_by(
                RawArticle.fetched_at.desc()
            ).limit(5).all()
            
            for i, (title, fetched_at) in enumerate(articles, 1):
                print(f"  {i}. {title[:70]}")
                print(f"     Fetched: {fetched_at}")
        else:
            print("\n⚠️  No Gmail articles found in database")
            print("\nPossible reasons:")
            print("  1. No newsletters from configured senders in inbox")
            print("  2. Newsletters already processed")
            print("  3. Gmail credentials issue")
            print("  4. Sender list doesn't match your newsletters")

        # Check configured senders
        print("\n📋 Configured Newsletter Senders:")
        print("  1. tldr@mail.tldrnewsletter.com")
        print("  2. batch@deeplearning.ai")
        print("  3. newsletters@superhuman.com")

        # Check all sources
        print("\n📊 Articles by Source:")
        sources = session.query(
            RawArticle.source,
            func.count(RawArticle.id).label('count')
        ).group_by(
            RawArticle.source
        ).order_by(
            func.count(RawArticle.id).desc()
        ).all()
        
        for source, count in sources:
            emoji = "📧" if source == "gmail" else "📰"
            print(f"  {emoji} {source}: {count}")

except Exception as e:
    print(f"\n❌ Error: {e}")

print("\n" + "=" * 60)
print("✅ Check complete!")
print("=" * 60)
