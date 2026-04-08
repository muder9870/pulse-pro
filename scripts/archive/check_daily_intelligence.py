#!/usr/bin/env python3
"""
Quick diagnostic script to check Daily Intelligence status
"""
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle, DailyIntelligence
from sqlalchemy import func, desc
from datetime import datetime

def check_daily_intelligence():
    print("=" * 80)
    print("DAILY INTELLIGENCE DIAGNOSTIC")
    print("=" * 80)
    
    with get_session() as session:
        # 1. Check if DailyIntelligence records exist
        intel_count = session.query(func.count(DailyIntelligence.id)).scalar()
        print(f"\n1. DailyIntelligence Records: {intel_count}")
        
        if intel_count > 0:
            latest = session.query(DailyIntelligence).order_by(desc(DailyIntelligence.created_at)).first()
            print(f"   Latest Date: {latest.date}")
            print(f"   Created At: {latest.created_at}")
            print(f"   Stories JSON: {latest.top_stories_json[:100]}...")
        
        # 2. Check articles with 'decided' state
        decided_count = session.query(func.count(RawArticle.id)).filter(
            RawArticle.state == 'decided'
        ).scalar()
        print(f"\n2. Articles with state='decided': {decided_count}")
        
        # 3. Check all article states
        states = session.query(
            RawArticle.state,
            func.count(RawArticle.id)
        ).group_by(RawArticle.state).all()
        
        print(f"\n3. Article States Distribution:")
        for state, count in states:
            print(f"   {state}: {count}")
        
        # 4. Check processed articles with priority
        priority_count = session.query(func.count(ProcessedArticle.id)).filter(
            ProcessedArticle.priority.isnot(None)
        ).scalar()
        print(f"\n4. Processed Articles with Priority: {priority_count}")
        
        # 5. Check top priority articles
        top_articles = session.query(
            RawArticle.title,
            RawArticle.state,
            ProcessedArticle.priority,
            ProcessedArticle.priority_score
        ).join(
            ProcessedArticle,
            RawArticle.id == ProcessedArticle.raw_article_id
        ).order_by(
            desc(ProcessedArticle.priority_score)
        ).limit(5).all()
        
        print(f"\n5. Top 5 Articles by Priority Score:")
        for title, state, priority, score in top_articles:
            print(f"   [{state}] {priority} ({score:.2f}): {title[:60]}...")
        
        # 6. Recommendation
        print(f"\n" + "=" * 80)
        print("DIAGNOSIS:")
        print("=" * 80)
        
        if intel_count == 0:
            print("❌ No Daily Intelligence records found!")
            print("   → The pipeline needs to run to generate daily intelligence")
            print("   → Run: POST /api/pipeline/run")
        elif decided_count == 0:
            print("⚠️  No articles in 'decided' state!")
            print("   → Articles need to go through the decision engine")
            print("   → The pipeline should set state='decided' after priority scoring")
        else:
            print("✅ Daily Intelligence data exists and should be visible")
            print("   → Check browser console for frontend errors")
            print("   → Verify /api/intelligence/daily endpoint returns data")

if __name__ == "__main__":
    check_daily_intelligence()
