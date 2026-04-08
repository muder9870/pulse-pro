"""
Bug Condition Exploration Test for Stories KeyError Fix

**Validates: Requirements 1.1, 1.2**

This test explores the bug condition where get_top_stories() crashes with KeyError: 0
when attempting to retrieve stories with tags. The bug occurs at line 682 in database.py
where integer indexing (row[0], row[1]) is used on a sqlite3.Row object configured for
named column access.

CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
Expected failure: KeyError: 0 at line 682 when accessing row[0].

The test will pass after the fix is implemented (changing row[0] to row['article_id']
and row[1] to row['tag']).
"""

from __future__ import annotations

import os
import unittest


class TestStoriesKeyErrorBugCondition(unittest.TestCase):
    """
    Property 1: Fault Condition - Tags Retrieved Successfully
    
    Test that get_top_stories() successfully returns stories with tags populated
    when stories with tags exist in the database. This test encodes the expected
    behavior and will fail on unfixed code with KeyError: 0.
    """

    def setUp(self) -> None:
        """Set up test database with stories and tags."""
        os.environ["DISABLE_SCHEDULER"] = "1"

        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag
        import time

        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))

        # Create test data: stories with tags using ORM
        with db.get_session() as session:
            # Insert raw articles with unique URLs
            raw1 = RawArticle(
                title=f'Test Article 1 {timestamp}',
                url=f'https://example.com/bugfix1-{timestamp}',
                source='arxiv',
                category='cs.AI',
                raw_content='Content 1',
                processed=1,
                is_duplicate=0
            )
            raw2 = RawArticle(
                title=f'Test Article 2 {timestamp}',
                url=f'https://example.com/bugfix2-{timestamp}',
                source='reddit',
                category='technology',
                raw_content='Content 2',
                processed=1,
                is_duplicate=0
            )
            session.add(raw1)
            session.add(raw2)
            session.flush()
            
            # Store IDs for cleanup
            self.raw_ids = [raw1.id, raw2.id]
            
            # Insert processed articles
            proc1 = ProcessedArticle(
                raw_article_id=raw1.id,
                summary='Summary 1',
                key_takeaways='Takeaways 1',
                viral_score=70,
                tech_score=60,
                relevance_score=50
            )
            proc2 = ProcessedArticle(
                raw_article_id=raw2.id,
                summary='Summary 2',
                key_takeaways='Takeaways 2',
                viral_score=80,
                tech_score=70,
                relevance_score=60
            )
            session.add(proc1)
            session.add(proc2)
            session.flush()
            
            # Store processed IDs for cleanup
            self.proc_ids = [proc1.id, proc2.id]
            
            # Insert tags - THIS IS THE CRITICAL DATA THAT TRIGGERS THE BUG
            tag1 = ArticleTag(article_id=proc1.id, tag='AI')
            tag2 = ArticleTag(article_id=proc1.id, tag='MachineLearning')
            tag3 = ArticleTag(article_id=proc2.id, tag='Technology')
            session.add(tag1)
            session.add(tag2)
            session.add(tag3)
            
            session.commit()

    def tearDown(self) -> None:
        """Clean up test database."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent
        
        # Clean up test data - delete in correct order to respect foreign keys
        with db.get_session() as session:
            # Delete related records first
            if hasattr(self, 'proc_ids'):
                # Delete article images
                session.query(ArticleImage).filter(
                    ArticleImage.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
                # Delete generated content
                session.query(GeneratedContent).filter(
                    GeneratedContent.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
                # Delete article tags
                session.query(ArticleTag).filter(
                    ArticleTag.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
                # Delete processed articles
                session.query(ProcessedArticle).filter(
                    ProcessedArticle.id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
            
            if hasattr(self, 'raw_ids'):
                # Delete raw articles
                session.query(RawArticle).filter(
                    RawArticle.id.in_(self.raw_ids)
                ).delete(synchronize_session=False)
                
            session.commit()

    def test_get_top_stories_with_tags_no_crash(self) -> None:
        """
        Test that get_top_stories() returns stories with tags without crashing.
        
        This test will FAIL on unfixed code with KeyError: 0 at line 682.
        This failure confirms the bug exists.
        
        After the fix is applied, this test will pass, confirming that:
        - Stories are retrieved successfully
        - Tags are populated correctly
        - Hashtags are generated from tags
        - No KeyError is raised
        """
        from backend.database import get_top_stories

        # Call get_top_stories() with no limit to get all stories - this will crash on unfixed code
        result = get_top_stories(limit=None)

        # Assertions that verify expected behavior (will only run after fix)
        self.assertIsInstance(result, list, "Result should be a list of stories")
        self.assertGreater(len(result), 0, "Should return at least one story")

        # Verify stories with tags have tags field populated
        story_with_tags = next((s for s in result if s["id"] == self.proc_ids[0]), None)
        self.assertIsNotNone(story_with_tags, f"Story with ID {self.proc_ids[0]} should exist")
        self.assertIn("tags", story_with_tags, "Story should have tags field")
        self.assertIsInstance(story_with_tags["tags"], list, "Tags should be a list")
        self.assertGreater(len(story_with_tags["tags"]), 0, "Story should have at least one tag")
        self.assertIn("AI", story_with_tags["tags"], "Story should have 'AI' tag")
        self.assertIn("MachineLearning", story_with_tags["tags"], "Story should have 'MachineLearning' tag")

        # Verify hashtags are generated from tags
        self.assertIn("hashtags", story_with_tags, "Story should have hashtags field")
        self.assertIsInstance(story_with_tags["hashtags"], list, "Hashtags should be a list")
        self.assertGreater(len(story_with_tags["hashtags"]), 0, "Story should have at least one hashtag")

    def test_get_top_stories_with_limit(self) -> None:
        """
        Test that get_top_stories(limit=1) works with tags.
        
        This test will FAIL on unfixed code with KeyError: 0.
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=1)

        self.assertIsInstance(result, list, "Result should be a list")
        self.assertLessEqual(len(result), 1, "Should return at most 1 story")
        
        if len(result) > 0:
            story = result[0]
            self.assertIn("tags", story, "Story should have tags field")
            self.assertIn("hashtags", story, "Story should have hashtags field")

    def test_get_top_stories_with_category_sort(self) -> None:
        """
        Test that get_top_stories(sort='category') works with tags.
        
        This test will FAIL on unfixed code with KeyError: 0.
        """
        from backend.database import get_top_stories

        result = get_top_stories(sort="category")

        self.assertIsInstance(result, list, "Result should be a list")
        self.assertGreater(len(result), 0, "Should return at least one story")
        
        # Verify all stories have tags and hashtags fields
        for story in result:
            self.assertIn("tags", story, "Story should have tags field")
            self.assertIn("hashtags", story, "Story should have hashtags field")
            self.assertIsInstance(story["tags"], list, "Tags should be a list")
            self.assertIsInstance(story["hashtags"], list, "Hashtags should be a list")


if __name__ == "__main__":
    unittest.main()
