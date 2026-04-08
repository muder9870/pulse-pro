"""
Bug Condition Exploration Test for Analytics Quality Score Fix

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

This test explores the bug condition where get_top_stories() incorrectly returns
category_score=0 for articles with valid score components (viral_score, tech_score,
relevance_score). The bug occurs at line 219 in backend/database.py where category_score
is mapped to article.priority_score, which defaults to 0.0 for all articles.

CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
Expected failure: Articles with non-null score components return category_score=0
instead of the average of their non-null scores.

The test will pass after the fix is implemented (calculating category_score as the
average of non-null score components instead of using priority_score).
"""

from __future__ import annotations

import os
import sys
import unittest

# Force SQLite for testing BEFORE importing backend modules
os.environ["DISABLE_SCHEDULER"] = "1"
# Override DATABASE_URL to use SQLite for testing
os.environ["DATABASE_URL"] = "sqlite:///data/test_app.db"


class TestAnalyticsQualityScoreBugCondition(unittest.TestCase):
    """
    Property 1: Fault Condition - Category Score Returns Zero for Articles with Valid Score Components
    
    Test that get_top_stories() correctly calculates category_score as the average of
    non-null score components (viral_score, tech_score, relevance_score) instead of
    returning 0. This test encodes the expected behavior and will fail on unfixed code
    where category_score is mapped to priority_score (which defaults to 0.0).
    
    **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    """

    def setUp(self) -> None:
        """Set up test database with articles having various score combinations."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, Base
        from backend.cache_manager import invalidate_cache
        import time

        # Create all tables in the test database
        Base.metadata.create_all(bind=db.engine)
        
        # Clear cache to ensure fresh data
        invalidate_cache("stories")

        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))

        # Create test data: articles with various score combinations
        with db.get_session() as session:
            # Article 1: All three scores present (high quality)
            raw1 = RawArticle(
                title=f'High Quality Article {timestamp}',
                url=f'https://example.com/quality-high-{timestamp}',
                source='arxiv',
                category='cs.AI',
                raw_content='High quality content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw1)
            session.flush()
            
            proc1 = ProcessedArticle(
                raw_article_id=raw1.id,
                summary='High quality summary',
                key_takeaways='Important takeaways',
                viral_score=80,
                tech_score=75,
                relevance_score=70,
                priority_score=0.0  # This is the bug - defaults to 0.0
            )
            session.add(proc1)
            session.flush()
            self.article1_id = proc1.id
            self.article1_expected_score = (80 + 75 + 70) / 3  # 75.0
            
            # Article 2: All three scores present (excellent quality)
            raw2 = RawArticle(
                title=f'Excellent Article {timestamp}',
                url=f'https://example.com/quality-excellent-{timestamp}',
                source='reddit',
                category='technology',
                raw_content='Excellent content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw2)
            session.flush()
            
            proc2 = ProcessedArticle(
                raw_article_id=raw2.id,
                summary='Excellent summary',
                key_takeaways='Key insights',
                viral_score=95,
                tech_score=90,
                relevance_score=85,
                priority_score=0.0
            )
            session.add(proc2)
            session.flush()
            self.article2_id = proc2.id
            self.article2_expected_score = (95 + 90 + 85) / 3  # 90.0
            
            # Article 3: Two scores present (one null)
            raw3 = RawArticle(
                title=f'Mixed Scores Article {timestamp}',
                url=f'https://example.com/quality-mixed-{timestamp}',
                source='hackernews',
                category='programming',
                raw_content='Mixed quality content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw3)
            session.flush()
            
            proc3 = ProcessedArticle(
                raw_article_id=raw3.id,
                summary='Mixed quality summary',
                key_takeaways='Some takeaways',
                viral_score=60,
                tech_score=None,  # Null score
                relevance_score=50,
                priority_score=0.0
            )
            session.add(proc3)
            session.flush()
            self.article3_id = proc3.id
            self.article3_expected_score = (60 + 50) / 2  # 55.0
            
            # Article 4: One score present (two nulls)
            raw4 = RawArticle(
                title=f'Single Score Article {timestamp}',
                url=f'https://example.com/quality-single-{timestamp}',
                source='twitter',
                category='news',
                raw_content='Single score content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw4)
            session.flush()
            
            proc4 = ProcessedArticle(
                raw_article_id=raw4.id,
                summary='Single score summary',
                key_takeaways='One takeaway',
                viral_score=None,
                tech_score=None,
                relevance_score=65,
                priority_score=0.0
            )
            session.add(proc4)
            session.flush()
            self.article4_id = proc4.id
            self.article4_expected_score = 65.0
            
            # Article 5: All null scores (edge case - should default to 0)
            raw5 = RawArticle(
                title=f'No Scores Article {timestamp}',
                url=f'https://example.com/quality-none-{timestamp}',
                source='blog',
                category='general',
                raw_content='No scores content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw5)
            session.flush()
            
            proc5 = ProcessedArticle(
                raw_article_id=raw5.id,
                summary='No scores summary',
                key_takeaways='No takeaways',
                viral_score=None,
                tech_score=None,
                relevance_score=None,
                priority_score=0.0
            )
            session.add(proc5)
            session.flush()
            self.article5_id = proc5.id
            self.article5_expected_score = 0.0  # Should default to 0
            
            # Store all IDs for cleanup
            self.raw_ids = [raw1.id, raw2.id, raw3.id, raw4.id, raw5.id]
            self.proc_ids = [proc1.id, proc2.id, proc3.id, proc4.id, proc5.id]
            
            session.commit()

    def tearDown(self) -> None:
        """Clean up test database."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent, Base
        
        # Clean up test data - delete in correct order to respect foreign keys
        with db.get_session() as session:
            if hasattr(self, 'proc_ids'):
                # Delete related records first
                session.query(ArticleImage).filter(
                    ArticleImage.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
                session.query(GeneratedContent).filter(
                    GeneratedContent.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
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
        
        # Drop all tables after tests
        Base.metadata.drop_all(bind=db.engine)

    def test_category_score_calculated_from_all_three_scores(self) -> None:
        """
        Test that category_score is calculated as average of all three score components.
        
        This test will FAIL on unfixed code with category_score=0 instead of ~75.0.
        This failure confirms the bug exists.
        
        After the fix is applied, this test will pass, confirming that:
        - category_score is calculated as (viral_score + tech_score + relevance_score) / 3
        - Articles with all three scores return the correct average
        
        **Validates: Requirements 2.1, 2.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the high quality article
        article = next((s for s in result if s["id"] == self.article1_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article1_id} should exist")
        
        # CRITICAL ASSERTION: This will FAIL on unfixed code
        # Unfixed code returns category_score=0 (from priority_score)
        # Fixed code should return category_score=75.0 (average of 80, 75, 70)
        self.assertAlmostEqual(
            article["category_score"],
            self.article1_expected_score,
            places=1,
            msg=f"Article with viral_score=80, tech_score=75, relevance_score=70 should have "
                f"category_score={self.article1_expected_score}, but got {article['category_score']}. "
                f"This indicates the bug where category_score is mapped to priority_score (0.0) "
                f"instead of being calculated from score components."
        )

    def test_category_score_calculated_from_excellent_scores(self) -> None:
        """
        Test that category_score correctly reflects excellent quality articles.
        
        This test will FAIL on unfixed code with category_score=0 instead of ~90.0.
        
        **Validates: Requirements 2.1, 2.3, 2.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the excellent quality article
        article = next((s for s in result if s["id"] == self.article2_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article2_id} should exist")
        
        # CRITICAL ASSERTION: This will FAIL on unfixed code
        # Unfixed code returns category_score=0
        # Fixed code should return category_score=90.0 (average of 95, 90, 85)
        self.assertAlmostEqual(
            article["category_score"],
            self.article2_expected_score,
            places=1,
            msg=f"Article with viral_score=95, tech_score=90, relevance_score=85 should have "
                f"category_score={self.article2_expected_score}, but got {article['category_score']}. "
                f"This should be in the Excellent range (90-100) for proper quality distribution."
        )

    def test_category_score_calculated_from_two_scores(self) -> None:
        """
        Test that category_score is calculated from only non-null scores.
        
        This test will FAIL on unfixed code with category_score=0 instead of 55.0.
        
        **Validates: Requirements 2.1, 2.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the mixed scores article
        article = next((s for s in result if s["id"] == self.article3_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article3_id} should exist")
        
        # CRITICAL ASSERTION: This will FAIL on unfixed code
        # Unfixed code returns category_score=0
        # Fixed code should return category_score=55.0 (average of 60, 50, ignoring null)
        self.assertAlmostEqual(
            article["category_score"],
            self.article3_expected_score,
            places=1,
            msg=f"Article with viral_score=60, tech_score=None, relevance_score=50 should have "
                f"category_score={self.article3_expected_score}, but got {article['category_score']}. "
                f"Null scores should be excluded from the average calculation."
        )

    def test_category_score_calculated_from_single_score(self) -> None:
        """
        Test that category_score works with only one non-null score.
        
        This test will FAIL on unfixed code with category_score=0 instead of 65.0.
        
        **Validates: Requirements 2.1, 2.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the single score article
        article = next((s for s in result if s["id"] == self.article4_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article4_id} should exist")
        
        # CRITICAL ASSERTION: This will FAIL on unfixed code
        # Unfixed code returns category_score=0
        # Fixed code should return category_score=65.0 (the only non-null score)
        self.assertAlmostEqual(
            article["category_score"],
            self.article4_expected_score,
            places=1,
            msg=f"Article with viral_score=None, tech_score=None, relevance_score=65 should have "
                f"category_score={self.article4_expected_score}, but got {article['category_score']}. "
                f"Single non-null score should be used as the category_score."
        )

    def test_category_score_defaults_to_zero_for_all_null_scores(self) -> None:
        """
        Test that category_score defaults to 0 when all scores are null.
        
        This test should PASS on both unfixed and fixed code (preservation requirement).
        
        **Validates: Requirement 3.1 (Unchanged Behavior)**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the no scores article
        article = next((s for s in result if s["id"] == self.article5_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article5_id} should exist")
        
        # This should work on both unfixed and fixed code
        self.assertEqual(
            article["category_score"],
            self.article5_expected_score,
            msg=f"Article with all null scores should have category_score=0, "
                f"but got {article['category_score']}. This is a preservation requirement."
        )

    def test_quality_distribution_across_ranges(self) -> None:
        """
        Test that articles are distributed across quality ranges (not all in Poor/0-49).
        
        This test will FAIL on unfixed code where all articles return category_score=0.
        
        **Validates: Requirements 2.2, 2.3**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Categorize articles by quality range
        poor = []      # 0-49
        average = []   # 50-69
        good = []      # 70-89
        excellent = [] # 90-100
        
        for article in result:
            score = article["category_score"]
            if score < 50:
                poor.append(article["id"])
            elif score < 70:
                average.append(article["id"])
            elif score < 90:
                good.append(article["id"])
            else:
                excellent.append(article["id"])
        
        # CRITICAL ASSERTIONS: These will FAIL on unfixed code
        # Unfixed code: all articles in "poor" (category_score=0)
        # Fixed code: proper distribution across ranges
        
        # We expect article 1 (75.0) in Good range
        self.assertIn(
            self.article1_id,
            good,
            msg=f"Article 1 with expected score {self.article1_expected_score} should be in Good range (70-89), "
                f"but is in: Poor={poor}, Average={average}, Good={good}, Excellent={excellent}"
        )
        
        # We expect article 2 (90.0) in Excellent range
        self.assertIn(
            self.article2_id,
            excellent,
            msg=f"Article 2 with expected score {self.article2_expected_score} should be in Excellent range (90-100), "
                f"but is in: Poor={poor}, Average={average}, Good={good}, Excellent={excellent}"
        )
        
        # We expect article 3 (55.0) in Average range
        self.assertIn(
            self.article3_id,
            average,
            msg=f"Article 3 with expected score {self.article3_expected_score} should be in Average range (50-69), "
                f"but is in: Poor={poor}, Average={average}, Good={good}, Excellent={excellent}"
        )
        
        # We expect article 4 (65.0) in Average range
        self.assertIn(
            self.article4_id,
            average,
            msg=f"Article 4 with expected score {self.article4_expected_score} should be in Average range (50-69), "
                f"but is in: Poor={poor}, Average={average}, Good={good}, Excellent={excellent}"
        )
        
        # We expect article 5 (0.0) in Poor range
        self.assertIn(
            self.article5_id,
            poor,
            msg=f"Article 5 with expected score {self.article5_expected_score} should be in Poor range (0-49), "
                f"but is in: Poor={poor}, Average={average}, Good={good}, Excellent={excellent}"
        )


class TestAnalyticsQualityScorePreservation(unittest.TestCase):
    """
    Property 2: Preservation - Non-Category-Score Fields Remain Unchanged
    
    These tests verify that all fields except category_score return identical values
    before and after the fix. This ensures no regressions are introduced when fixing
    the category_score calculation bug.
    
    IMPORTANT: These tests should PASS on UNFIXED code to establish a baseline of
    behavior that must be preserved.
    
    **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
    """

    def setUp(self) -> None:
        """Set up test database with articles having various configurations."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent, Base
        from backend.cache_manager import invalidate_cache
        import time

        # Drop and recreate all tables to ensure clean state
        Base.metadata.drop_all(bind=db.engine)
        Base.metadata.create_all(bind=db.engine)
        
        # Clear cache to ensure fresh data
        invalidate_cache("stories")

        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))

        # Create test data with various field configurations
        with db.get_session() as session:
            # Article 1: Complete article with all fields populated
            raw1 = RawArticle(
                title=f'Complete Article {timestamp}',
                url=f'https://example.com/complete-{timestamp}',
                source='arxiv',
                category='cs.AI',
                raw_content='Complete article content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw1)
            session.flush()
            
            proc1 = ProcessedArticle(
                raw_article_id=raw1.id,
                summary='Complete article summary',
                key_takeaways='Complete takeaways',
                viral_score=80,
                tech_score=75,
                relevance_score=70,
                priority_score=0.0,
                priority='high',
                priority_reason='Important topic'
            )
            session.add(proc1)
            session.flush()
            self.article1_id = proc1.id
            
            # Article 2: Article with null score components
            raw2 = RawArticle(
                title=f'Null Scores Article {timestamp}',
                url=f'https://example.com/null-scores-{timestamp}',
                source='reddit',
                category='technology',
                raw_content='Null scores content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw2)
            session.flush()
            
            proc2 = ProcessedArticle(
                raw_article_id=raw2.id,
                summary='Null scores summary',
                key_takeaways='Null scores takeaways',
                viral_score=None,
                tech_score=None,
                relevance_score=None,
                priority_score=0.0,
                priority='low'
            )
            session.add(proc2)
            session.flush()
            self.article2_id = proc2.id
            
            # Article 3: Article with mixed null/non-null scores
            raw3 = RawArticle(
                title=f'Mixed Article {timestamp}',
                url=f'https://example.com/mixed-{timestamp}',
                source='hackernews',
                category='programming',
                raw_content='Mixed content',
                processed=1,
                is_duplicate=0
            )
            session.add(raw3)
            session.flush()
            
            proc3 = ProcessedArticle(
                raw_article_id=raw3.id,
                summary='Mixed summary',
                key_takeaways='Mixed takeaways',
                viral_score=60,
                tech_score=None,
                relevance_score=50,
                priority_score=0.0
            )
            session.add(proc3)
            session.flush()
            self.article3_id = proc3.id
            
            # Store all IDs for cleanup
            self.raw_ids = [raw1.id, raw2.id, raw3.id]
            self.proc_ids = [proc1.id, proc2.id, proc3.id]
            
            session.commit()

    def tearDown(self) -> None:
        """Clean up test database."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent, Base
        
        # Clean up test data - delete in correct order to respect foreign keys
        with db.get_session() as session:
            if hasattr(self, 'proc_ids'):
                # Delete related records first
                session.query(ArticleImage).filter(
                    ArticleImage.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
                session.query(GeneratedContent).filter(
                    GeneratedContent.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
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
        
        # Drop all tables after tests
        Base.metadata.drop_all(bind=db.engine)

    def test_non_category_score_fields_preserved_complete_article(self) -> None:
        """
        Test that all non-category_score fields are present and have correct types for complete articles.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        The test verifies that get_top_stories returns all expected fields with correct data types.
        
        **Validates: Requirements 3.2, 3.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find an article with all scores present
        article = next((s for s in result if s["id"] == self.article1_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article1_id} should exist")
        
        # Verify all expected fields are present
        required_fields = [
            'id', 'title', 'url', 'source', 'category', 'summary',
            'viral_score', 'tech_score', 'relevance_score', 'category_score',
            'priority', 'created_at', 'fetched_at', 'tags', 'hashtags'
        ]
        
        for field in required_fields:
            self.assertIn(field, article, f"Field '{field}' should be present in API response")
        
        # Verify field types
        self.assertIsInstance(article['id'], int, "id should be an integer")
        self.assertIsInstance(article['title'], str, "title should be a string")
        self.assertIsInstance(article['url'], str, "url should be a string")
        self.assertIsInstance(article['source'], str, "source should be a string")
        self.assertIsInstance(article['summary'], str, "summary should be a string")
        self.assertIsInstance(article['tags'], list, "tags should be a list")
        self.assertIsInstance(article['hashtags'], list, "hashtags should be a list")
        
        # Verify score fields are numbers (not modified to strings or other types)
        self.assertIsInstance(article['viral_score'], (int, float), "viral_score should be a number")
        self.assertIsInstance(article['tech_score'], (int, float), "tech_score should be a number")
        self.assertIsInstance(article['relevance_score'], (int, float), "relevance_score should be a number")
        
        # Verify individual score components have expected values (80, 75, 70)
        self.assertEqual(article['viral_score'], 80, "viral_score should be preserved as 80")
        self.assertEqual(article['tech_score'], 75, "tech_score should be preserved as 75")
        self.assertEqual(article['relevance_score'], 70, "relevance_score should be preserved as 70")

    def test_non_category_score_fields_preserved_null_scores(self) -> None:
        """
        Test that all non-category_score fields are present for articles with null scores.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirements 3.2, 3.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the null scores article
        article = next((s for s in result if s["id"] == self.article2_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article2_id} should exist")
        
        # Verify all expected fields are present
        required_fields = [
            'id', 'title', 'url', 'source', 'category', 'summary',
            'viral_score', 'tech_score', 'relevance_score', 'category_score',
            'priority', 'created_at', 'fetched_at', 'tags', 'hashtags'
        ]
        
        for field in required_fields:
            self.assertIn(field, article, f"Field '{field}' should be present in API response")

    def test_non_category_score_fields_preserved_mixed_scores(self) -> None:
        """
        Test that all non-category_score fields are present for articles with mixed null/non-null scores.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirements 3.2, 3.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the mixed scores article
        article = next((s for s in result if s["id"] == self.article3_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article3_id} should exist")
        
        # Verify all expected fields are present
        required_fields = [
            'id', 'title', 'url', 'source', 'category', 'summary',
            'viral_score', 'tech_score', 'relevance_score', 'category_score',
            'priority', 'created_at', 'fetched_at', 'tags', 'hashtags'
        ]
        
        for field in required_fields:
            self.assertIn(field, article, f"Field '{field}' should be present in API response")
        
        # Verify that the specific score values are preserved correctly
        self.assertEqual(article['viral_score'], 60, "viral_score should be preserved as 60")
        self.assertIsNone(article['tech_score'], "tech_score should remain None")
        self.assertEqual(article['relevance_score'], 50, "relevance_score should be preserved as 50")

    def test_individual_score_components_remain_unchanged(self) -> None:
        """
        Test that individual score components (viral_score, tech_score, relevance_score)
        are returned unchanged and not modified by category_score calculation.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirement 3.2**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the complete article
        article = next((s for s in result if s["id"] == self.article1_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article1_id} should exist")
        
        # Verify individual score components are unchanged
        self.assertEqual(article['viral_score'], 80, "viral_score should remain 80")
        self.assertEqual(article['tech_score'], 75, "tech_score should remain 75")
        self.assertEqual(article['relevance_score'], 70, "relevance_score should remain 70")

    def test_null_score_components_remain_null(self) -> None:
        """
        Test that null score components remain null (not converted to 0).
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirement 3.2**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the null scores article
        article = next((s for s in result if s["id"] == self.article2_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article2_id} should exist")
        
        # Verify null scores remain null
        self.assertIsNone(article['viral_score'], "viral_score should remain None")
        self.assertIsNone(article['tech_score'], "tech_score should remain None")
        self.assertIsNone(article['relevance_score'], "relevance_score should remain None")
        
        # Find the mixed scores article
        article = next((s for s in result if s["id"] == self.article3_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article3_id} should exist")
        
        # Verify null tech_score remains null
        self.assertEqual(article['viral_score'], 60, "viral_score should be 60")
        self.assertIsNone(article['tech_score'], "tech_score should remain None")
        self.assertEqual(article['relevance_score'], 50, "relevance_score should be 50")

    def test_category_score_defaults_to_zero_for_null_scores(self) -> None:
        """
        Test that articles with all null score components continue to default category_score to 0.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirement 3.1**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Find the null scores article
        article = next((s for s in result if s["id"] == self.article2_id), None)
        self.assertIsNotNone(article, f"Article with ID {self.article2_id} should exist")
        
        # Verify category_score defaults to 0 for articles with all null scores
        self.assertEqual(
            article['category_score'],
            0.0,
            msg="Articles with all null score components should default category_score to 0"
        )

    def test_response_structure_preserved(self) -> None:
        """
        Test that the API response structure and field names remain identical.
        
        This test should PASS on UNFIXED code, establishing baseline behavior to preserve.
        
        **Validates: Requirements 3.2, 3.4**
        """
        from backend.database import get_top_stories

        result = get_top_stories(limit=None)
        
        # Verify result is a list
        self.assertIsInstance(result, list, "Result should be a list")
        
        # Get any article to check structure
        if result:
            article = result[0]
            
            # Verify all expected fields are present
            expected_fields = [
                'id', 'title', 'url', 'source', 'category', 'summary',
                'viral_score', 'tech_score', 'relevance_score', 'category_score',
                'priority', 'created_at', 'fetched_at', 'tags', 'hashtags'
            ]
            
            for field in expected_fields:
                self.assertIn(
                    field,
                    article,
                    msg=f"Field '{field}' should be present in API response"
                )


if __name__ == "__main__":
    unittest.main()
