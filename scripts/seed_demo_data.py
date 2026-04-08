#!/usr/bin/env python3
"""Seed demo data using PostgreSQL and ORM."""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle, ArticleTag
from sqlalchemy import func


def seed() -> None:
    """Seed demo data into the database."""
    now = datetime.now(timezone.utc)
    
    with get_session() as session:
        # Check if data already exists
        count = session.query(func.count(RawArticle.id)).scalar()
        if count > 0:
            print(f"Database already has {count} articles. Skipping seed.")
            return

        # Create demo articles
        articles_data = [
            {
                "title": "Transformer breakthrough beats benchmark",
                "url": "https://example.com/demo/transformer-benchmark",
                "source": "arxiv",
                "category": "cs.AI",
                "raw_content": "A mock article about transformers and evaluation benchmarks.",
                "fetched_at": now,
                "processed": 1,
                "is_duplicate": 0,
            },
            {
                "title": "Open-source agent framework ships new tools",
                "url": "https://example.com/demo/agent-framework",
                "source": "github",
                "category": "General AI",
                "raw_content": "A mock article about agent tooling, tracing, and evals.",
                "fetched_at": now,
                "processed": 1,
                "is_duplicate": 0,
            },
            {
                "title": "New vision model improves realtime segmentation",
                "url": "https://example.com/demo/vision-segmentation",
                "source": "reddit",
                "category": "MachineLearning",
                "raw_content": "A mock article about computer vision segmentation and speed.",
                "fetched_at": now,
                "processed": 1,
                "is_duplicate": 0,
            },
        ]

        # Create raw articles and processed articles
        for i, article_data in enumerate(articles_data, start=1):
            # Create raw article
            raw_article = RawArticle(**article_data)
            session.add(raw_article)
            session.flush()  # Get the ID
            
            # Create processed article
            processed_article = ProcessedArticle(
                raw_article_id=raw_article.id,
                summary="Seeded demo summary.",
                key_takeaways="- Takeaway 1\n- Takeaway 2\n- Takeaway 3",
                viral_score=70,
                tech_score=65,
                relevance_score=55,
            )
            session.add(processed_article)
            session.flush()  # Get the ID
            
            # Create tags
            for tag_name in ["AI", "ML"]:
                tag = ArticleTag(
                    article_id=processed_article.id,
                    tag=tag_name
                )
                session.add(tag)
        
        session.commit()
        print(f"✅ Seeded {len(articles_data)} demo articles successfully!")


if __name__ == "__main__":
    seed()
