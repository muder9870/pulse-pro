#!/usr/bin/env python3
"""Debug script to check papers in Research Deep Dive"""

import sys
sys.path.insert(0, ".")

from backend.db.session import SessionLocal
from backend.models import RawArticle, ProcessedArticle
from sqlalchemy import func

db = SessionLocal()

try:
    print("=" * 80)
    print("PAPER DATABASE CHECK")
    print("=" * 80)
    
    # Check total articles
    total_articles = db.query(func.count(RawArticle.id)).scalar()
    print(f"\n📊 Total Raw Articles: {total_articles}")
    
    # Check articles by source
    print("\n📍 Articles by Source:")
    sources = db.query(
        RawArticle.source, 
        func.count(RawArticle.id)
    ).filter(RawArticle.source != None).group_by(RawArticle.source).all()
    
    for source, count in sources:
        print(f"   {source}: {count}")
    
    # Check arxiv articles specifically (case-insensitive)
    from sqlalchemy import func, or_
    arxiv_count = db.query(func.count(RawArticle.id)).filter(
        func.lower(RawArticle.source) == 'arxiv'
    ).scalar()
    print(f"\n🔍 ArXiv Articles (case-insensitive): {arxiv_count}")
    
    # Check processed articles
    processed_count = db.query(func.count(ProcessedArticle.id)).scalar()
    print(f"✅ Processed Articles: {processed_count}")
    
    # Check arxiv articles with processing status
    print("\n📋 ArXiv Articles Details:")
    arxiv_articles = db.query(RawArticle).filter(
        func.lower(RawArticle.source) == 'arxiv'
    ).limit(10).all()
    
    if arxiv_articles:
        for art in arxiv_articles:
            proc = db.query(ProcessedArticle).filter(
                ProcessedArticle.raw_article_id == art.id
            ).first()
            status = "✓ Processed" if proc else "✗ Unprocessed"
            category = art.category or "N/A"
            summary_preview = art.raw_content[:50] if art.raw_content else "N/A"
            print(f"\n   ID {art.id}: {art.title[:60]}...")
            print(f"      Status: {status}")
            print(f"      Category: {category}")
            print(f"      Source: {art.source}")
            if proc:
                print(f"      Summary: {proc.summary[:60] if proc.summary else 'N/A'}...")
    else:
        print("   ❌ No ArXiv articles found in database")
    
    # Check if there are any papers with PaperAnalysis
    from backend.models import PaperAnalysis
    paper_analyses = db.query(func.count(PaperAnalysis.article_id)).scalar()
    print(f"\n📚 Papers with Deep Analysis: {paper_analyses}")
    
    if paper_analyses > 0:
        print("\n   Papers with Analysis:")
        analyses = db.query(PaperAnalysis).limit(5).all()
        for analysis in analyses:
            proc = db.query(ProcessedArticle).filter(
                ProcessedArticle.id == analysis.article_id
            ).first()
            if proc:
                raw = db.query(RawArticle).filter(
                    RawArticle.id == proc.raw_article_id
                ).first()
                if raw:
                    print(f"\n   • ID {analysis.article_id}: {raw.title[:50]}...")
                    print(f"     Methodology: {analysis.methodology[:50] if analysis.methodology else 'N/A'}...")
    
    print("\n" + "=" * 80)
    
finally:
    db.close()
