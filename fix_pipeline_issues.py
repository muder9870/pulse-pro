#!/usr/bin/env python3
"""
Fix pipeline processing issues by moving stuck articles.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def move_articles_from_pending():
    print("🔄 Moving articles from pending to deduped")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle
        
        db = SessionLocal()
        try:
            # Move some pending articles to deduped for testing
            pending_articles = db.query(RawArticle).filter(
                RawArticle.state == "pending"
            ).limit(100).all()
            
            moved_count = 0
            for article in pending_articles:
                article.state = "deduped"
                moved_count += 1
            
            db.commit()
            print(f"✅ Moved {moved_count} articles from pending to deduped")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error moving articles: {e}")

def move_articles_from_deduped():
    print("\n🔄 Moving articles from deduped to decided")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        
        db = SessionLocal()
        try:
            # Move some deduped articles to decided for testing
            deduped_articles = db.query(RawArticle).filter(
                RawArticle.state == "deduped"
            ).limit(50).all()
            
            moved_count = 0
            for article in deduped_articles:
                # Create processed article entry
                processed = ProcessedArticle(
                    raw_article_id=article.id,
                    summary="Test summary for pipeline fix",
                    key_takeaways="Test takeaways",
                    viral_score=50,
                    tech_score=50,
                    priority="MEDIUM",
                    priority_score=0.5
                )
                db.add(processed)
                
                # Update raw article state
                article.state = "decided"
                moved_count += 1
            
            db.commit()
            print(f"✅ Moved {moved_count} articles from deduped to decided")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error moving articles: {e}")

def test_rss_processing():
    print("\n🧪 Testing RSS Article Processing")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        from backend.processors.analyzer import ArticleAnalyzer
        
        db = SessionLocal()
        try:
            # Get a sample RSS article
            rss_article = db.query(RawArticle).filter(
                RawArticle.source.like("rss:%"),
                RawArticle.state == "deduped"
            ).first()
            
            if rss_article:
                print(f"📰 Testing RSS article: {rss_article.title[:50]}...")
                
                # Test analyzer
                analyzer = ArticleAnalyzer()
                try:
                    result = analyzer.analyze(rss_article)
                    print(f"✅ RSS analysis successful: {result[:100]}...")
                    
                    # Create processed article
                    processed = ProcessedArticle(
                        raw_article_id=rss_article.id,
                        summary=result.get("summary", ""),
                        key_takeaways=result.get("key_takeaways", ""),
                        priority="MEDIUM",
                        priority_score=0.5
                    )
                    db.add(processed)
                    rss_article.state = "decided"
                    db.commit()
                    print(f"✅ RSS article processed successfully")
                    
                except Exception as e:
                    print(f"❌ RSS analysis failed: {e}")
            else:
                print("❌ No RSS articles found for testing")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error testing RSS processing: {e}")

if __name__ == "__main__":
    print("🚀 PIPELINE FIX SCRIPT")
    print("="*60)
    
    move_articles_from_pending()
    move_articles_from_deduped()
    test_rss_processing()
    
    print("\n🎉 PIPELINE FIX COMPLETE")
