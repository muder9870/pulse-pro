import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.database import get_top_stories
from backend.models import ProcessedArticle, GeneratedContent
from backend.database import get_session

def verify():
    print("Fetching top stories...")
    stories = get_top_stories(limit=5)
    
    if not stories:
        print("No stories found in database.")
        return

    for story in stories:
        print(f"Story ID: {story['id']}")
        print(f"Title: {story['title'][:50]}...")
        print(f"Platforms: {story.get('platforms')}")
        
        # Cross-check with database directly
        with get_session() as session:
            count = session.query(GeneratedContent).filter(
                GeneratedContent.article_id == story['id']
            ).count()
            print(f"Manual count of generated content: {count}")
        print("-" * 20)

if __name__ == "__main__":
    verify()
