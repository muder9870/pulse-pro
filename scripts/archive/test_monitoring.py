#!/usr/bin/env python3
"""
Test script for database performance monitoring system.
Tests monitored_session() context manager and query statistics.
"""

import sys
import time
from backend.database import monitored_session, get_query_stats, get_session
from backend.models import RawArticle, ProcessedArticle, GeneratedContent

def test_monitored_session_select():
    """Test SELECT operation with monitoring."""
    print("Testing SELECT operation with monitoring...")
    with monitored_session("test_select") as session:
        articles = session.query(RawArticle).limit(5).all()
        print(f"  ✓ Retrieved {len(articles)} articles")

def test_monitored_session_count():
    """Test COUNT operation with monitoring."""
    print("Testing COUNT operation with monitoring...")
    with monitored_session("test_count") as session:
        count = session.query(RawArticle).count()
        print(f"  ✓ Total articles: {count}")

def test_monitored_session_join():
    """Test JOIN operation with monitoring."""
    print("Testing JOIN operation with monitoring...")
    with monitored_session("test_join") as session:
        results = session.query(ProcessedArticle).join(
            RawArticle
        ).limit(3).all()
        print(f"  ✓ Retrieved {len(results)} processed articles with joins")

def test_monitored_session_insert():
    """Test INSERT operation with monitoring."""
    print("Testing INSERT operation with monitoring...")
    with monitored_session("test_insert") as session:
        # Create a test article
        test_article = RawArticle(
            title="Test Monitoring Article",
            url=f"https://test.com/monitoring-{int(time.time())}",
            source="test",
            category="test",
            state="new"
        )
        session.add(test_article)
        session.commit()
        article_id = test_article.id
        print(f"  ✓ Inserted test article with ID: {article_id}")
        
        # Clean up - delete the test article
        session.delete(test_article)
        session.commit()
        print(f"  ✓ Cleaned up test article")

def test_slow_query_detection():
    """Test slow query detection (>100ms)."""
    print("Testing slow query detection...")
    with monitored_session("test_slow_query") as session:
        # Simulate a slow query with a sleep
        from sqlalchemy import text
        session.execute(text("SELECT pg_sleep(0.15)"))  # Sleep for 150ms
        print("  ✓ Executed intentionally slow query (150ms)")

def test_query_stats():
    """Test get_query_stats() function."""
    print("\nTesting query statistics retrieval...")
    
    # Get stats for last hour
    stats = get_query_stats(hours=1)
    
    print(f"\nQuery Statistics (last 1 hour):")
    print(f"  Total queries: {stats['total_queries']}")
    print(f"  Average duration: {stats['avg_duration_ms']}ms")
    print(f"  Slow queries (>100ms): {stats['slow_queries']}")
    print(f"\n  Queries by operation:")
    
    for op_name, op_stats in stats['queries_by_operation'].items():
        print(f"    {op_name}:")
        print(f"      Count: {op_stats['count']}")
        print(f"      Avg duration: {op_stats['avg_duration_ms']}ms")
        print(f"      Slow queries: {op_stats['slow_count']}")
        print(f"      Errors: {op_stats['error_count']}")

def main():
    """Run all monitoring tests."""
    print("=" * 60)
    print("Database Performance Monitoring Test Suite")
    print("=" * 60)
    
    try:
        # Run various database operations with monitoring
        test_monitored_session_select()
        test_monitored_session_count()
        test_monitored_session_join()
        test_monitored_session_insert()
        test_slow_query_detection()
        
        # Wait a moment for logs to be written
        time.sleep(1)
        
        # Test query statistics
        test_query_stats()
        
        print("\n" + "=" * 60)
        print("✓ All monitoring tests completed successfully!")
        print("=" * 60)
        
        return 0
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
