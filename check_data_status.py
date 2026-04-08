#!/usr/bin/env python3
"""
Check metrics and sources data status.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def check_system_data():
    print("📊 Checking System Data Status")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.repositories.system_repository import SystemRepository
        
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            
            # Check system health
            print("🔍 System Health:")
            health = repo.get_system_health()
            for service in health:
                name = service["service_name"]
                status = service["status"]
                success = service["success_count"]
                failures = service["failure_count"]
                print(f"  {name}: {status} (success: {success}, failures: {failures})")
            
            print("\n📈 Fallback Stats:")
            stats = repo.get_fallback_stats()
            print(f"  Total processed: {stats['total_processed']}")
            print(f"  Fallback count: {stats['fallback_count']}")
            print(f"  Fallback rate: {stats['fallback_rate']}")
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking system data: {e}")

def check_articles_data():
    print("\n📰 Checking Articles Data")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import ProcessedArticle, Source
        
        db = SessionLocal()
        try:
            # Check processed articles
            total_articles = db.query(ProcessedArticle).count()
            print(f"📊 Total processed articles: {total_articles}")
            
            # Check by source
            sources = db.query(Source).all()
            print(f"\n🔍 Sources:")
            for source in sources:
                article_count = db.query(ProcessedArticle).filter(ProcessedArticle.source_id == source.id).count()
                print(f"  {source.name}: {article_count} articles")
            
            # Check recent articles
            recent = db.query(ProcessedArticle).order_by(ProcessedArticle.created_at.desc()).limit(5).all()
            print(f"\n📅 Recent articles:")
            for article in recent:
                print(f"  {article.title[:50]}... ({article.created_at})")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking articles data: {e}")

def check_queue_data():
    print("\n🔄 Checking Queue Data")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import ProcessedArticle
        
        db = SessionLocal()
        try:
            # Check articles by state
            states = {
                "pending": 0,
                "decided": 0, 
                "deduped": 0,
                "archived": 0
            }
            
            for state in states:
                count = db.query(ProcessedArticle).filter(ProcessedArticle.state == state).count()
                states[state] = count
            
            print("📊 Queue States:")
            for state, count in states.items():
                print(f"  {state}: {count}")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking queue data: {e}")

def check_fetcher_status():
    print("\n🤖 Checking Fetcher Services")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.repositories.system_repository import SystemRepository
        
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            health = repo.get_system_health()
            
            print("🔍 Fetcher Services:")
            for service in health:
                if "fetcher" in service["service_name"]:
                    name = service["service_name"]
                    status = service["status"]
                    last_run = service["last_run_at"]
                    last_error = service["last_error"]
                    print(f"  {name}: {status}")
                    if last_run:
                        print(f"    Last run: {last_run}")
                    if last_error:
                        print(f"    Error: {last_error}")
                        
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error checking fetcher status: {e}")

if __name__ == "__main__":
    print("🚀 DATA STATUS CHECK")
    print("="*60)
    
    check_system_data()
    check_articles_data()
    check_queue_data()
    check_fetcher_status()
    
    print("\n🎉 CHECK COMPLETE")
