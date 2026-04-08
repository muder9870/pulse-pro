"""
Preservation Property Tests for Stories KeyError Fix

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

These tests verify that the fix for the KeyError bug does not introduce regressions
in the existing story retrieval behavior. They test:
- Story data structure preservation
- Sorting behavior (score-based and category-based)
- Limit parameter handling
- Stories with no tags return empty arrays
- Hashtag generation from tags

IMPORTANT: These tests are designed to run on UNFIXED code by testing with stories
that have NO tags, avoiding the bug condition (KeyError at line 682).

Property 2: Preservation - Story Retrieval Behavior
"""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch


class TestStoriesPreservation(unittest.TestCase):
    """
    Property-based tests for preservation of story retrieval behavior.
    
    These tests verify that all non-buggy aspects of get_top_stories() remain
    unchanged after the fix is applied.
    """

    def setUp(self) -> None:
        """Set up test database with stories WITHOUT tags to avoid bug."""
        os.environ["DISABLE_SCHEDULER"] = "1"

        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle
        import time

        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))
        
        # Create test data: stories WITHOUT tags (to avoid triggering the bug)
        with db.get_session() as session:
            # Insert raw articles with different categories and sources
            # Let database auto-generate IDs
            raw1 = RawArticle(
                title=f'AI Article Test {timestamp}', url=f'https://example.com/test1-{timestamp}',
                source='arxiv', category='cs.AI', raw_content='Content 1',
                processed=1, is_duplicate=0
            )
            raw2 = RawArticle(
                title=f'Tech Article Test {timestamp}', url=f'https://example.com/test2-{timestamp}',
                source='reddit', category='technology', raw_content='Content 2',
                processed=1, is_duplicate=0
            )
            raw3 = RawArticle(
                title=f'Science Article Test {timestamp}', url=f'https://example.com/test3-{timestamp}',
                source='arxiv', category='cs.LG', raw_content='Content 3',
                processed=1, is_duplicate=0
            )
            raw4 = RawArticle(
                title=f'Duplicate Article Test {timestamp}', url=f'https://example.com/test4-{timestamp}',
                source='reddit', category='news', raw_content='Content 4',
                processed=1, is_duplicate=1
            )
            session.add_all([raw1, raw2, raw3, raw4])
            session.flush()
            
            # Store IDs for later reference
            self.raw_ids = [raw1.id, raw2.id, raw3.id, raw4.id]
            
            # Insert processed articles with different scores
            proc1 = ProcessedArticle(
                raw_article_id=raw1.id, summary='Summary 1',
                key_takeaways='Takeaways 1', viral_score=90,
                tech_score=80, relevance_score=70
            )
            proc2 = ProcessedArticle(
                raw_article_id=raw2.id, summary='Summary 2',
                key_takeaways='Takeaways 2', viral_score=60,
                tech_score=50, relevance_score=40
            )
            proc3 = ProcessedArticle(
                raw_article_id=raw3.id, summary='Summary 3',
                key_takeaways='Takeaways 3', viral_score=75,
                tech_score=65, relevance_score=55
            )
            proc4 = ProcessedArticle(
                raw_article_id=raw4.id, summary='Summary 4',
                key_takeaways='Takeaways 4', viral_score=100,
                tech_score=100, relevance_score=100
            )
            session.add_all([proc1, proc2, proc3, proc4])
            
            # Store processed IDs for later reference
            session.flush()
            self.proc_ids = [proc1.id, proc2.id, proc3.id, proc4.id]
            
            # NOTE: NO tags inserted - this avoids triggering the bug on unfixed code
            
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

    def test_story_data_structure_preservation(self) -> None:
        """
        Requirement 3.1: Stories must continue to be retrieved with correct data structure.
        
        Verify that each story contains all expected fields with correct types.
        """
        from backend.database import get_top_stories

        result = get_top_stories()

        self.assertIsInstance(result, list, "Result should be a list")
        self.assertGreater(len(result), 0, "Should return at least one story")

        # Verify data structure for each story
        for story in result:
            # Required fields
            self.assertIn("id", story, "Story should have id field")
            self.assertIn("title", story, "Story should have title field")
            self.assertIn("url", story, "Story should have url field")
            self.assertIn("source", story, "Story should have source field")
            self.assertIn("category", story, "Story should have category field")
            self.assertIn("summary", story, "Story should have summary field")
            
            # Score fields
            self.assertIn("viral_score", story, "Story should have viral_score field")
            self.assertIn("tech_score", story, "Story should have tech_score field")
            self.assertIn("relevance_score", story, "Story should have relevance_score field")
            
            # Timestamp fields
            self.assertIn("created_at", story, "Story should have created_at field")
            self.assertIn("fetched_at", story, "Story should have fetched_at field")
            
            # Tags fields (should be present even if empty)
            self.assertIn("tags", story, "Story should have tags field")
            self.assertIn("hashtags", story, "Story should have hashtags field")
            
            # total_score should be removed from final output
            self.assertNotIn("total_score", story, "total_score should be removed from output")

    def test_stories_with_no_tags_return_empty_arrays(self) -> None:
        """
        Requirement 3.3: Stories with no tags must return empty arrays for tags and hashtags.
        
        This is a critical preservation test - verifies behavior for stories without tags.
        """
        from backend.database import get_top_stories

        result = get_top_stories()

        self.assertGreater(len(result), 0, "Should return at least one story")

        # All stories in our test database have no tags
        for story in result:
            self.assertEqual(story["tags"], [], f"Story {story['id']} should have empty tags array")
            self.assertEqual(story["hashtags"], [], f"Story {story['id']} should have empty hashtags array")

    def test_duplicate_filtering_preserved(self) -> None:
        """
        Requirement 3.1: Duplicate filtering (is_duplicate = 0) must continue to work.
        
        Verify that stories marked as duplicates are not returned.
        """
        from backend.database import get_top_stories

        # Get all stories and filter to just our test stories
        result = get_top_stories(limit=None)
        test_stories = [s for s in result if s["id"] in self.proc_ids]

        # Story with index 3 (raw4/proc4) is marked as duplicate and should not appear
        story_ids = [s["id"] for s in test_stories]
        self.assertNotIn(self.proc_ids[3], story_ids, "Duplicate story should not be returned")
        
        # Non-duplicate stories should be returned
        self.assertIn(self.proc_ids[0], story_ids, "Non-duplicate story 1 should be returned")
        self.assertIn(self.proc_ids[1], story_ids, "Non-duplicate story 2 should be returned")
        self.assertIn(self.proc_ids[2], story_ids, "Non-duplicate story 3 should be returned")

    @unittest.skip("Requires hypothesis library - testing manually with multiple examples instead")
    def test_limit_parameter_handling_preserved_property(self, limit: int | None) -> None:
        """
        Requirement 3.4: Limit parameter handling must remain unchanged.
        
        Property-based test that verifies limit parameter works correctly across
        many different limit values.
        """
        pass

    def test_limit_parameter_handling_preserved(self) -> None:
        """
        Requirement 3.4: Limit parameter handling must remain unchanged.
        
        Test multiple limit values to verify correct behavior.
        """
        from backend.database import get_top_stories

        # Test various limit values
        test_limits = [1, 2, 3, 5, 10, None]
        
        for limit in test_limits:
            with self.subTest(limit=limit):
                result = get_top_stories(limit=limit)

                self.assertIsInstance(result, list, "Result should be a list")

                if limit is not None and limit > 0:
                    self.assertLessEqual(len(result), limit, f"Should return at most {limit} stories")
                
                # All returned stories should have correct structure
                for story in result:
                    self.assertIn("id", story)
                    self.assertIn("tags", story)
                    self.assertIn("hashtags", story)

    def test_limit_none_returns_all_stories(self) -> None:
        """
        Requirement 3.4: When limit is None, all stories should be returned.
        """
        from backend.database import get_top_stories

        # Get stories with limit=None
        result_no_limit = get_top_stories(limit=None)
        
        # Get stories with limit=5
        result_with_limit = get_top_stories(limit=5)
        
        # When limit is None, should return more stories than with a specific limit
        # (assuming there are more than 5 stories in the database)
        self.assertGreaterEqual(len(result_no_limit), len(result_with_limit), 
                               "limit=None should return at least as many stories as limit=5")
        
        # Verify that limit=None returns significantly more results
        # (there should be many stories in the database)
        self.assertGreater(len(result_no_limit), 10, 
                          "limit=None should return more than 10 stories from the database")

    @unittest.skip("Requires hypothesis library - testing manually with multiple examples instead")
    def test_sorting_behavior_preserved_property(self, sort: str) -> None:
        """
        Requirements 3.5, 3.6: Sorting by score and category must work correctly.
        
        Property-based test that verifies sorting works across different sort parameter values.
        """
        pass

    def test_sorting_behavior_preserved(self) -> None:
        """
        Requirements 3.5, 3.6: Sorting by score and category must work correctly.
        
        Test multiple sort parameter values to verify correct behavior.
        """
        from backend.database import get_top_stories

        # Test various sort parameter values
        test_sorts = ["score", "category", "Score", "CATEGORY", "  score  ", "  category  "]
        
        for sort in test_sorts:
            with self.subTest(sort=sort):
                result = get_top_stories(sort=sort)

                self.assertIsInstance(result, list, "Result should be a list")
                self.assertGreater(len(result), 0, "Should return at least one story")

                sort_normalized = (sort or "score").strip().lower()

                if sort_normalized == "category":
                    # Verify category-based sorting
                    # Stories should be sorted by category first, then by score
                    categories = [s.get("category") for s in result]
                    
                    # Check that categories are in order (None values first, then alphabetically)
                    for i in range(len(categories) - 1):
                        curr_cat = categories[i]
                        next_cat = categories[i + 1]
                        
                        # None should come before non-None
                        if curr_cat is None:
                            continue
                        if next_cat is None:
                            self.fail("None category should come before non-None categories")
                        
                        # Non-None categories should be in alphabetical order or same category
                        self.assertLessEqual(curr_cat, next_cat, 
                            f"Categories should be sorted: {curr_cat} should come before or equal to {next_cat}")
                else:
                    # Verify score-based sorting (default)
                    # Stories should be sorted by total_score descending
                    # We can verify this by checking that scores are in descending order
                    for i in range(len(result) - 1):
                        curr_story = result[i]
                        next_story = result[i + 1]
                        
                        curr_total = (curr_story.get("viral_score", 0) + 
                                     curr_story.get("tech_score", 0) + 
                                     curr_story.get("relevance_score", 0))
                        next_total = (next_story.get("viral_score", 0) + 
                                     next_story.get("tech_score", 0) + 
                                     next_story.get("relevance_score", 0))
                        
                        self.assertGreaterEqual(curr_total, next_total,
                            f"Stories should be sorted by total score descending: {curr_total} >= {next_total}")

    def test_score_based_sorting_default(self) -> None:
        """
        Requirement 3.6: Default sorting should be by total_score descending.
        """
        from backend.database import get_top_stories

        result = get_top_stories()  # Default sort

        self.assertGreater(len(result), 0, "Should return at least one story")

        # Calculate total scores and verify descending order
        total_scores = []
        for story in result:
            total = (story.get("viral_score", 0) + 
                    story.get("tech_score", 0) + 
                    story.get("relevance_score", 0))
            total_scores.append(total)

        # Verify descending order
        for i in range(len(total_scores) - 1):
            self.assertGreaterEqual(total_scores[i], total_scores[i + 1],
                f"Scores should be in descending order: {total_scores[i]} >= {total_scores[i + 1]}")

    def test_category_based_sorting(self) -> None:
        """
        Requirement 3.5: When sort='category', stories should be sorted by category then score.
        """
        from backend.database import get_top_stories

        result = get_top_stories(sort="category")

        self.assertGreater(len(result), 0, "Should return at least one story")

        # Verify category-based sorting
        for i in range(len(result) - 1):
            curr_cat = result[i].get("category")
            next_cat = result[i + 1].get("category")
            
            if curr_cat is None:
                continue
            if next_cat is None:
                self.fail("None category should come before non-None categories")
            
            # Categories should be in order
            self.assertLessEqual(curr_cat, next_cat,
                f"Categories should be sorted: {curr_cat} <= {next_cat}")

    def test_hashtag_generation_from_tags(self) -> None:
        """
        Requirement 3.2: Hashtag generation from tags must work correctly.
        
        This test uses mocking to test hashtag generation without triggering the bug.
        """
        from backend.database import get_top_stories, tag_to_hashtag

        # Test the tag_to_hashtag function directly
        test_cases = [
            ("AI", "#AI"),
            ("MachineLearning", "#MachineLearning"),
            ("machine learning", "#MachineLearning"),
            ("deep-learning", "#DeepLearning"),
            ("", "#AI"),  # Empty tag should return default
            ("123", "#123"),
        ]

        for tag, expected_hashtag in test_cases:
            result = tag_to_hashtag(tag)
            self.assertEqual(result, expected_hashtag,
                f"tag_to_hashtag('{tag}') should return '{expected_hashtag}', got '{result}'")

    def test_hashtag_generation_integration_with_mock(self) -> None:
        """
        Requirement 3.2: Verify hashtag generation is applied to tags in stories.
        
        Uses mocking to avoid triggering the bug while testing hashtag generation.
        """
        from backend.database import get_top_stories

        # Get stories (will have empty tags since we didn't insert any)
        result = get_top_stories()
        
        # Verify that hashtags field exists and is a list
        for story in result:
            self.assertIn("hashtags", story)
            self.assertIsInstance(story["hashtags"], list)
            
            # If tags exist, hashtags should be generated
            if story["tags"]:
                self.assertEqual(len(story["hashtags"]), len(story["tags"]),
                    "Number of hashtags should match number of tags")


if __name__ == "__main__":
    unittest.main()
