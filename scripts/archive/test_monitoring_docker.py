#!/usr/bin/env python3
"""Test monitoring inside Docker container."""
import sys
sys.path.insert(0, '/app')

from backend.database import monitored_session, get_query_stats
from backend.models import RawArticle

print("Testing monitored_session...")
try:
    with monitored_session('test_query') as session:
        count = session.query(RawArticle).count()
        print(f"✓ Article count: {count}")
    
    print("\nGetting query stats...")
    stats = get_query_stats(1)
    print(f"✓ Total queries: {stats['total_queries']}")
    print(f"✓ Avg duration: {stats['avg_duration_ms']}ms")
    print(f"✓ Slow queries: {stats['slow_queries']}")
    
    print("\n✓ Monitoring system working!")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
