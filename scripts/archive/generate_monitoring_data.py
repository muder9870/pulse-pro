#!/usr/bin/env python3
"""Generate monitoring data with various query types."""
import sys
sys.path.insert(0, '/app')

from backend.database import monitored_session
from backend.models import RawArticle, ProcessedArticle, GeneratedContent
from sqlalchemy import func

print("Generating monitoring data with various queries...")

# Fast SELECT query
print("1. Fast SELECT query...")
with monitored_session('select_articles') as session:
    articles = session.query(RawArticle).limit(10).all()
    print(f"   Retrieved {len(articles)} articles")

# COUNT query
print("2. COUNT query...")
with monitored_session('count_articles') as session:
    count = session.query(func.count(RawArticle.id)).scalar()
    print(f"   Total articles: {count}")

# JOIN query
print("3. JOIN query...")
with monitored_session('join_processed') as session:
    results = session.query(ProcessedArticle).join(RawArticle).limit(5).all()
    print(f"   Retrieved {len(results)} processed articles")

# Aggregation query
print("4. Aggregation query...")
with monitored_session('aggregate_by_source') as session:
    sources = session.query(
        RawArticle.source,
        func.count(RawArticle.id)
    ).group_by(RawArticle.source).all()
    print(f"   Found {len(sources)} sources")

# Another fast query
print("5. Fast query for generated content...")
with monitored_session('select_content') as session:
    content = session.query(GeneratedContent).limit(5).all()
    print(f"   Retrieved {len(content)} content items")

print("\n✓ Generated monitoring data successfully!")
