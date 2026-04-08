#!/usr/bin/env python3
"""Debug Gmail fetcher using PostgreSQL and ORM."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle, GmailNewsletterSender
from sqlalchemy import func, inspect

def check_gmail_data():
    """Check Gmail-related data in the database."""
    try:
        with get_session() as session:
            print("--- Gmail Fetcher Diagnostics ---")
            
            # Check raw_articles from gmail
            raw_count = session.query(func.count(RawArticle.id)).filter(
                RawArticle.source == 'gmail'
            ).scalar()
            print(f"Raw articles from 'gmail': {raw_count}")

            # Check processed_articles from gmail
            proc_count = session.query(func.count(ProcessedArticle.id)).join(
                RawArticle
            ).filter(
                RawArticle.source == 'gmail'
            ).scalar()
            print(f"Processed articles from 'gmail': {proc_count}")

            # Check discovered senders
            inspector = inspect(session.bind)
            tables = inspector.get_table_names()
            
            if 'gmail_newsletter_senders' in tables:
                sender_count = session.query(func.count(GmailNewsletterSender.id)).scalar()
                print(f"Discovered Gmail senders: {sender_count}")
                
                # Get top senders
                top_senders = session.query(
                    GmailNewsletterSender.sender_email,
                    GmailNewsletterSender.message_count
                ).order_by(
                    GmailNewsletterSender.message_count.desc()
                ).limit(5).all()
                
                print("Top senders:")
                for email, count in top_senders:
                    print(f"  - {email}: {count} messages")
            else:
                print("Table 'gmail_newsletter_senders' does not exist.")

            # Check distinct sources in raw_articles
            sources = session.query(RawArticle.source).distinct().all()
            source_list = [s[0] for s in sources]
            print(f"\nAll sources in raw_articles: {source_list}")

    except Exception as e:
        print(f"Error checking Gmail data: {e}")

if __name__ == "__main__":
    check_gmail_data()
