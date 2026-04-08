#!/usr/bin/env python3
"""Check database state distribution using PostgreSQL and ORM."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.database import get_session
from backend.models import RawArticle
from sqlalchemy import func, inspect

def check_db():
    """Check raw_articles table structure and state distribution."""
    try:
        with get_session() as session:
            # Get table columns using SQLAlchemy inspector
            inspector = inspect(session.bind)
            cols = [col['name'] for col in inspector.get_columns('raw_articles')]
            print(f"Columns in raw_articles: {cols}")
            
            if "state" in cols:
                # Query state distribution using ORM
                results = session.query(
                    RawArticle.state,
                    func.count(RawArticle.id)
                ).group_by(RawArticle.state).all()
                
                print("State distribution in raw_articles:")
                for state, count in results:
                    print(f"  {state}: {count}")
            else:
                print("ERROR: state column missing!")
                
    except Exception as e:
        print(f"Error checking DB: {e}")

if __name__ == "__main__":
    check_db()
