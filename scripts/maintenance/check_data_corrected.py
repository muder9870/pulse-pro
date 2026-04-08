#!/usr/bin/env python3
"""
Check metrics and sources data status - corrected version.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def check_articles_data():
    print("📰 Checking Articles Data")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        
        db = SessionLocal()
        try:
            # Check raw articles
            total_raw = db.query(RawArticle).count()
            print(f"📊 Total raw articles: {total_raw}")
            
            # Check processed articles
            total_processed = db.query(ProcessedArticle).count()
            print(f"📊 Total processed articles: {total_processed}")
            
            # Check raw articles by source
            sources = db.query(RawArticle.source).distinct().all()
            print(f"\n🔍 Sources (from raw articles):")
            for source_tuple in sources:
                source_name = source_tuple[0]
                raw_count = db.query(RawArticle).filter(RawArticle.source == source_name).count()
                processed_count = db.query(ProcessedArticle).join(RawArticle).filter(RawArticle.source == source_name).count()
                print(f"  {source_name}: {raw_count} raw, {processed_count} processed")
            
            # Check raw articles by state
            states = db.query(RawArticle.state).distinct().all()
            print(f"\n📋 Raw Article States:")
            for state_tuple in states:
                state_name = state_tuple[0]
                count = db.query(RawArticle).filter(RawArticle.state == state_name).count()
                print(f"  {state_name}: {count}")
            
            # Check recent articles
            recent = db.query(RawArticle).order_by(RawArticle.fetched_at.desc()).limit(5).all()
            print(f"\n📅 Recent articles:")
            for article in recent:
                print(f"  {article.title[:50]}... ({article.source} - {article.fetched_at})")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking articles data: {e}")

def check_content_generation():
    print("\n✍️ Checking Content Generation")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import ProcessedArticle
        
        db = SessionLocal()
        try:
            # Check articles with generated content
            with_content = db.query(ProcessedArticle).filter(
                (ProcessedArticle.generated_content.isnot(None)) &
                (ProcessedArticle.generated_content != "")
            ).count()
            
            without_content = db.query(ProcessedArticle).filter(
                (ProcessedArticle.generated_content.is_(None)) |
                (ProcessedArticle.generated_content == "")
            ).count()
            
            print(f"📊 Articles with generated content: {with_content}")
            print(f"📊 Articles without generated content: {without_content}")
            
            # Check articles by platform
            platforms = db.query(ProcessedArticle.platform).distinct().all()
            print(f"\n📱 Platforms:")
            for platform_tuple in platforms:
                platform = platform_tuple[0]
                if platform:
                    count = db.query(ProcessedArticle).filter(ProcessedArticle.platform == platform).count()
                    print(f"  {platform}: {count}")
                    
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking content generation: {e}")

def check_system_metrics():
    print("\n📈 System Metrics")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.repositories.system_repository import SystemRepository
        
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            
            # Get system health
            health = repo.get_system_health()
            
            # Calculate metrics
            total_services = len(health)
            healthy_services = len([s for s in health if s["status"] == "ok"])
            failed_services = len([s for s in health if s["status"] != "ok"])
            
            print(f"🔧 Total services: {total_services}")
            print(f"✅ Healthy services: {healthy_services}")
            print(f"❌ Failed services: {failed_services}")
            
            # Get fallback stats
            stats = repo.get_fallback_stats()
            print(f"\n🔄 Fallback Statistics:")
            print(f"  Total processed: {stats['total_processed']}")
            print(f"  Fallback count: {stats['fallback_count']}")
            print(f"  Fallback rate: {stats['fallback_rate']:.2%}")
            
            # Check fetcher services specifically
            fetchers = [s for s in health if "fetcher" in s["service_name"]]
            print(f"\n🤖 Fetcher Services ({len(fetchers)}):")
            for fetcher in fetchers:
                name = fetcher["service_name"]
                status = fetcher["status"]
                success = fetcher["success_count"]
                failures = fetcher["failure_count"]
                print(f"  {name}: {status} (✅{success} ❌{failures})")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking system metrics: {e}")

def check_recent_activity():
    print("\n⏰ Recent Activity")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        from datetime import datetime, timedelta
        
        db = SessionLocal()
        try:
            # Check last 24 hours activity
            yesterday = datetime.now() - timedelta(days=1)
            
            # Recent raw articles
            recent_raw = db.query(RawArticle).filter(RawArticle.fetched_at >= yesterday).count()
            
            # Recent processed articles  
            recent_processed = db.query(ProcessedArticle).filter(ProcessedArticle.created_at >= yesterday).count()
            
            print(f"📅 Last 24 hours:")
            print(f"  Raw articles fetched: {recent_raw}")
            print(f"  Articles processed: {recent_processed}")
            
            # Check last fetch times
            fetchers = db.query(RawArticle.source).distinct().all()
            print(f"\n🕐 Last fetch times:")
            for source_tuple in fetchers:
                source = source_tuple[0]
                last_fetch = db.query(RawArticle).filter(
                    RawArticle.source == source
                ).order_by(RawArticle.fetched_at.desc()).first()
                
                if last_fetch:
                    print(f"  {source}: {last_fetch.fetched_at}")
                else:
                    print(f"  {source}: No data")
                    
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking recent activity: {e}")

if __name__ == "__main__":
    print("🚀 CORRECTED DATA STATUS CHECK")
    print("="*60)
    
    check_articles_data()
    check_content_generation()
    check_system_metrics()
    check_recent_activity()
    
    print("\n🎉 CHECK COMPLETE")
