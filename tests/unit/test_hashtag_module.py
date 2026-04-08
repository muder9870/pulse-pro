from __future__ import annotations

import unittest


class HashtagModuleTests(unittest.TestCase):
    def setUp(self) -> None:
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag

        # Clean up any existing test data first
        with db.get_session() as session:
            # Delete any existing test data
            session.query(ArticleTag).filter(ArticleTag.article_id == 999999).delete()
            session.query(ProcessedArticle).filter(ProcessedArticle.id == 999999).delete()
            session.query(RawArticle).filter(RawArticle.id == 999999).delete()
            session.commit()

        # Create test data using ORM
        with db.get_session() as session:
            # Create raw article with unique test ID
            raw_article = RawArticle(
                id=999999,
                title='Test Reddit Post',
                url='https://example.com/test-hashtag-999999',
                source='reddit',
                category='cs.AI',
                raw_content='Body',
                processed=1,
                is_duplicate=0
            )
            session.add(raw_article)
            session.flush()  # Ensure raw_article.id is available
            
            # Create processed article
            processed_article = ProcessedArticle(
                id=999999,
                raw_article_id=999999,
                summary='Summary',
                key_takeaways='Takeaways',
                viral_score=50,
                tech_score=40,
                relevance_score=10
            )
            session.add(processed_article)
            
            # Create article tags
            session.add(ArticleTag(article_id=999999, tag='AI'))
            session.add(ArticleTag(article_id=999999, tag='Transformers'))
            
            session.commit()

    def tearDown(self) -> None:
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, TrendingHashtag, ContentHashtag
        
        # Clean up test data
        with db.get_session() as session:
            session.query(ContentHashtag).filter(ContentHashtag.article_id == 999999).delete()
            session.query(ArticleTag).filter(ArticleTag.article_id == 999999).delete()
            session.query(TrendingHashtag).filter(TrendingHashtag.category == 'cs.AI').delete()
            session.query(ProcessedArticle).filter(ProcessedArticle.id == 999999).delete()
            session.query(RawArticle).filter(RawArticle.id == 999999).delete()
            session.commit()

    def test_hashtag_recommender_returns_results(self) -> None:
        from backend import database as db
        from backend.processors.hashtag_recommender import HashtagRecommender
        from backend.models import ContentHashtag

        db.upsert_trending_hashtag(
            hashtag="#ai",
            platform="twitter",
            volume=10,
            engagement_rate=0.5,
            growth_rate=1.0,
            trend_score=80,
            category="cs.AI",
        )
        db.upsert_trending_hashtag(
            hashtag="#transformers",
            platform="twitter",
            volume=5,
            engagement_rate=0.4,
            growth_rate=0.5,
            trend_score=70,
            category="cs.AI",
        )

        recs = HashtagRecommender().recommend(article_id=999999, platform="twitter", limit=3)
        self.assertTrue(len(recs) >= 1)
        self.assertTrue(all(r.hashtag.startswith("#") for r in recs))

        # Use ORM to count content hashtags
        with db.get_session() as session:
            n = session.query(ContentHashtag).filter(
                ContentHashtag.article_id == 999999,
                ContentHashtag.platform == 'twitter'
            ).count()
        self.assertGreaterEqual(n, 1)

    @unittest.skip("RedditCollector not yet converted to ORM - depends on get_connection()")
    def test_reddit_collector_updates_trending(self) -> None:
        from backend import database as db
        from backend.fetchers.hashtag_collectors.reddit_collector import RedditCollector

        updated = RedditCollector().run(window_hours=48, prev_window_hours=48, limit=10)
        self.assertGreaterEqual(updated, 1)

        rows = db.list_trending_hashtags("reddit", limit=10)
        self.assertTrue(len(rows) >= 1)


if __name__ == "__main__":
    unittest.main()

