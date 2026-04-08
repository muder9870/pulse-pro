#!/usr/bin/env python3
"""Check database state distribution using PostgreSQL and ORM."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RawArticle, ProcessedArticle
from sqlalchemy import func, inspect

def check_db():
    """Check database tables and article state distribution."""
    try:
        with get_session() as session:
            # Check if table exists using inspector
            inspector = inspect(session.bind)
            tables = inspector.get_table_names()
            
            if 'raw_articles' not in tables:
                print("Table 'raw_articles' does not exist.")
                return

            # Get total count
            total = session.query(func.count(RawArticle.id)).scalar()
            print(f"Total articles in raw_articles: {total}")

            # Get state distribution
            results = session.query(
                RawArticle.state,
                func.count(RawArticle.id)
            ).group_by(RawArticle.state).all()
            
            print("Article State Distribution:")
            
            if not results:
                print("  (No articles found in raw_articles)")
            else:
                # Convert to dict for easy lookup
                states = {state: count for state, count in results}
                
                # Print important states in order
                important_states = [
                    'pending', 'cleaning', 'cleaned', 'deduplicating', 'deduped', 
                    'archived', 'analyzing', 'analyzed', 'scoring', 'scored', 
                    'deciding', 'decided'
                ]
                
                for s in important_states:
                    count = states.get(s, 0)
                    print(f"  {s:15}: {count}")
                
                # Print any extra states found
                for state, count in results:
                    if state not in important_states:
                        print(f"  {str(state):15}: {count} (UNDEFINED STATE)")
            
            # Get processed articles count
            processed_count = session.query(func.count(ProcessedArticle.id)).scalar()
            print(f"Processed articles count: {processed_count}")
                
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_db()
