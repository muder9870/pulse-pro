#!/usr/bin/env python3
"""
Migration: Normalize ArXiv source names in database to lowercase 'arxiv'
Run this after ensuring Docker containers are running
"""

import sys
sys.path.insert(0, ".")

from backend.db.session import SessionLocal
from backend.models import RawArticle

db = SessionLocal()

try:
    print("=" * 80)
    print("NORMALIZING ARXIV SOURCE NAMES")
    print("=" * 80)
    
    # Find all articles with arxiv-like source (case-insensitive)
    from sqlalchemy import func, or_
    
    arxiv_variants = db.query(RawArticle).filter(
        func.lower(RawArticle.source).contains('arxiv')
    ).all()
    
    print(f"\n📊 Found {len(arxiv_variants)} properties with 'arxiv' in source name")
    
    variant_map = {}
    for article in arxiv_variants:
        if article.source:
            if article.source not in variant_map:
                variant_map[article.source] = 0
            variant_map[article.source] += 1
    
    print("\n📋 Source variants found:")
    for variant, count in variant_map.items():
        print(f"   '{variant}': {count}")
    
    # Normalize all to lowercase 'arxiv'
    updated_count = 0
    for article in arxiv_variants:
        if article.source.lower() != 'arxiv':
            article.source = 'arxiv'
            updated_count += 1
    
    if updated_count > 0:
        db.commit()
        print(f"\n✅ Updated {updated_count} articles to source='arxiv'")
    else:
        print(f"\n✅ All arxiv sources are already normalized")
    
    # Verify
    final_arxiv_count = db.query(RawArticle).filter(
        RawArticle.source == 'arxiv'
    ).count()
    
    print(f"\n📊 Total articles with source='arxiv': {final_arxiv_count}")
    
    print("\n" + "=" * 80)
    
except Exception as e:
    print(f"❌ Error: {e}")
    db.rollback()
finally:
    db.close()
