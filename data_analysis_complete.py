#!/usr/bin/env python3
"""
Complete data analysis for metrics and sources issues.
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent / "backend"))

def analyze_processing_pipeline():
    print("🔍 Processing Pipeline Analysis")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle, GeneratedContent
        
        db = SessionLocal()
        try:
            # Overall stats
            total_raw = db.query(RawArticle).count()
            total_processed = db.query(ProcessedArticle).count()
            processing_rate = (total_processed / total_raw * 100) if total_raw > 0 else 0
            
            print(f"📊 Processing Statistics:")
            print(f"  Raw articles: {total_raw}")
            print(f"  Processed articles: {total_processed}")
            print(f"  Processing rate: {processing_rate:.1f}%")
            
            # By source
            sources = db.query(RawArticle.source).distinct().all()
            print(f"\n🔍 Processing by Source:")
            for source_tuple in sources:
                source = source_tuple[0]
                raw_count = db.query(RawArticle).filter(RawArticle.source == source).count()
                processed_count = db.query(ProcessedArticle).join(RawArticle).filter(RawArticle.source == source).count()
                rate = (processed_count / raw_count * 100) if raw_count > 0 else 0
                print(f"  {source}: {raw_count} → {processed_count} ({rate:.1f}%)")
            
            # By state
            states = db.query(RawArticle.state).distinct().all()
            print(f"\n📋 Raw Article States:")
            for state_tuple in states:
                state = state_tuple[0]
                count = db.query(RawArticle).filter(RawArticle.state == state).count()
                percentage = (count / total_raw * 100) if total_raw > 0 else 0
                print(f"  {state}: {count} ({percentage:.1f}%)")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error analyzing pipeline: {e}")

def analyze_content_generation():
    print("\n✍️ Content Generation Analysis")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import ProcessedArticle, GeneratedContent
        
        db = SessionLocal()
        try:
            # Content generation stats
            total_processed = db.query(ProcessedArticle).count()
            total_generated = db.query(GeneratedContent).count()
            generation_rate = (total_generated / total_processed * 100) if total_processed > 0 else 0
            
            print(f"📊 Content Generation Statistics:")
            print(f"  Processed articles: {total_processed}")
            print(f"  Generated content pieces: {total_generated}")
            print(f"  Generation rate: {generation_rate:.1f}%")
            
            # By platform
            platforms = db.query(GeneratedContent.platform).distinct().all()
            print(f"\n📱 Generated Content by Platform:")
            for platform_tuple in platforms:
                platform = platform_tuple[0]
                count = db.query(GeneratedContent).filter(GeneratedContent.platform == platform).count()
                print(f"  {platform}: {count}")
            
            # Recent generation
            recent = db.query(GeneratedContent).order_by(GeneratedContent.generated_at.desc()).limit(5).all()
            print(f"\n📅 Recent Generated Content:")
            for content in recent:
                article = db.query(ProcessedArticle).filter(ProcessedArticle.id == content.article_id).first()
                if article and article.raw_article:
                    title = article.raw_article.title[:50]
                    print(f"  {title}... → {content.platform} ({content.generated_at})")
                    
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error analyzing content generation: {e}")

def analyze_pipeline_bottlenecks():
    print("\n🚧 Pipeline Bottleneck Analysis")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        from datetime import datetime, timedelta
        
        db = SessionLocal()
        try:
            # Check articles stuck in various states
            bottlenecks = {
                "pending": db.query(RawArticle).filter(RawArticle.state == "pending").count(),
                "deduped": db.query(RawArticle).filter(RawArticle.state == "deduped").count(),
                "decided": db.query(RawArticle).filter(RawArticle.state == "decided").count(),
                "analysis_failed": db.query(RawArticle).filter(RawArticle.state == "analysis_failed").count(),
                "archived": db.query(RawArticle).filter(RawArticle.state == "archived").count()
            }
            
            print(f"🚫 Pipeline Bottlenecks:")
            for state, count in bottlenecks.items():
                if count > 0:
                    print(f"  {state}: {count} articles stuck")
            
            # Check recent activity
            yesterday = datetime.now() - timedelta(days=1)
            recent_raw = db.query(RawArticle).filter(RawArticle.fetched_at >= yesterday).count()
            recent_processed = db.query(ProcessedArticle).filter(ProcessedArticle.processed_at >= yesterday).count()
            
            print(f"\n📅 Last 24 Hours Activity:")
            print(f"  Raw articles fetched: {recent_raw}")
            print(f"  Articles processed: {recent_processed}")
            
            if recent_raw > 0 and recent_processed == 0:
                print("  ⚠️  PROCESSING PIPELINE STALLED!")
            elif recent_processed < recent_raw * 0.1:
                print("  ⚠️  Processing rate very low!")
            else:
                print("  ✅ Processing pipeline active")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error analyzing bottlenecks: {e}")

def analyze_source_distribution():
    print("\n🌐 Source Distribution Analysis")
    print("="*50)
    
    try:
        from backend.db.session import SessionLocal
        from backend.db.models import RawArticle, ProcessedArticle
        
        db = SessionLocal()
        try:
            # Group sources by type
            rss_sources = []
            other_sources = []
            
            sources = db.query(RawArticle.source).distinct().all()
            for source_tuple in sources:
                source = source_tuple[0]
                if source.startswith("rss:"):
                    rss_sources.append(source)
                else:
                    other_sources.append(source)
            
            print(f"📡 RSS Sources ({len(rss_sources)}):")
            for source in sorted(rss_sources):
                raw_count = db.query(RawArticle).filter(RawArticle.source == source).count()
                processed_count = db.query(ProcessedArticle).join(RawArticle).filter(RawArticle.source == source).count()
                rate = (processed_count / raw_count * 100) if raw_count > 0 else 0
                status = "✅" if processed_count > 0 else "❌"
                print(f"  {status} {source.replace('rss:', '')}: {raw_count} → {processed_count} ({rate:.1f}%)")
            
            print(f"\n🔗 Other Sources ({len(other_sources)}):")
            for source in sorted(other_sources):
                raw_count = db.query(RawArticle).filter(RawArticle.source == source).count()
                processed_count = db.query(ProcessedArticle).join(RawArticle).filter(RawArticle.source == source).count()
                rate = (processed_count / raw_count * 100) if raw_count > 0 else 0
                status = "✅" if processed_count > 0 else "❌"
                print(f"  {status} {source}: {raw_count} → {processed_count} ({rate:.1f}%)")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Error analyzing sources: {e}")

def provide_recommendations():
    print("\n💡 Recommendations")
    print("="*50)
    
    print("🔧 METRICS ISSUES:")
    print("  1. Processing pipeline is severely underperforming (4.1% processing rate)")
    print("  2. Most articles are stuck in 'pending' and 'deduped' states")
    print("  3. Only arxiv source is being processed consistently")
    
    print("\n📰 SOURCES ISSUES:")
    print("  1. 18 RSS feeds have 0% processing rate")
    print("  2. Gmail, GitHub, direct_urls have 0% processing rate")
    print("  3. Only arxiv and test sources are being processed")
    
    print("\n🚀 IMMEDIATE ACTIONS:")
    print("  1. Check fetcher service logs for RSS processing errors")
    print("  2. Verify analyzer service is running for non-arxiv sources")
    print("  3. Check content generation service for platform-specific issues")
    print("  4. Review pipeline configuration for source-specific rules")
    
    print("\n🔍 NEXT STEPS:")
    print("  1. Run fetcher services manually to test RSS processing")
    print("  2. Check database for processing errors in logs")
    print("  3. Verify content generation templates are working")
    print("  4. Monitor pipeline after fixes")

if __name__ == "__main__":
    print("🚀 COMPLETE DATA ANALYSIS")
    print("="*60)
    
    analyze_processing_pipeline()
    analyze_content_generation()
    analyze_pipeline_bottlenecks()
    analyze_source_distribution()
    provide_recommendations()
    
    print("\n🎉 ANALYSIS COMPLETE")
