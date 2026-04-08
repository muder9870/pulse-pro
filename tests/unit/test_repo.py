import sys
import os
sys.path.append(os.getcwd())

from backend.db.session import SessionLocal
from backend.db.repositories.article_repo import get_stories_with_posts

def test_repo():
    db = SessionLocal()
    try:
        print("Testing article_repo.get_stories_with_posts...")
        stories = get_stories_with_posts(db, limit=1)
        print(f"Success: Fetched {len(stories)} stories.")
        if len(stories) > 0:
            print(f"First story title: {stories[0].title}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    test_repo()
