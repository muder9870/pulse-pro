from __future__ import annotations

import os
import unittest

# Run Celery tasks inline so analyze → score happens in-process (no worker needed).
os.environ.setdefault("CELERY_TASK_ALWAYS_EAGER", "1")


class PipelineScoringSanityTests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DISABLE_SCHEDULER"] = "1"

        from backend import database as db
        from backend.config import settings
        from backend.models import RawArticle
        import time

        settings.LLM_PROVIDER = "local"
        
        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))

        with db.get_session() as session:
            articles = [
                RawArticle(
                    title='New transformer breakthrough beats benchmark',
                    url=f'https://example.com/pipeline-a-{timestamp}',
                    source='arxiv',
                    category='cs.AI',
                    raw_content='<p>Hello world</p>',
                    processed=0,
                    is_duplicate=0
                ),
                RawArticle(
                    title='New transformer breakthrough beats benchmark',
                    url=f'https://example.com/pipeline-a-dup-{timestamp}',
                    source='reddit',
                    category='MachineLearning',
                    raw_content='Hello world',
                    processed=0,
                    is_duplicate=0
                ),
                RawArticle(
                    title='Open-source reproducible benchmark for agents',
                    url=f'https://example.com/pipeline-b-{timestamp}',
                    source='github',
                    category='General AI',
                    raw_content='Some content',
                    processed=0,
                    is_duplicate=0
                )
            ]
            session.add_all(articles)
            session.flush()
            
            # Store IDs for cleanup
            self.raw_ids = [article.id for article in articles]
            session.commit()

    def tearDown(self) -> None:
        """Clean up test database."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent
        
        # Clean up test data - delete in correct order to respect foreign keys
        with db.get_session() as session:
            # Get processed article IDs for cleanup
            if hasattr(self, 'raw_ids'):
                proc_ids = [p.id for p in session.query(ProcessedArticle).filter(
                    ProcessedArticle.raw_article_id.in_(self.raw_ids)
                ).all()]
                
                if proc_ids:
                    # Delete article images
                    session.query(ArticleImage).filter(
                        ArticleImage.article_id.in_(proc_ids)
                    ).delete(synchronize_session=False)
                    
                    # Delete generated content
                    session.query(GeneratedContent).filter(
                        GeneratedContent.article_id.in_(proc_ids)
                    ).delete(synchronize_session=False)
                    
                    # Delete article tags
                    session.query(ArticleTag).filter(
                        ArticleTag.article_id.in_(proc_ids)
                    ).delete(synchronize_session=False)
                    
                    # Delete processed articles
                    session.query(ProcessedArticle).filter(
                        ProcessedArticle.id.in_(proc_ids)
                    ).delete(synchronize_session=False)
                
                # Delete raw articles
                session.query(RawArticle).filter(
                    RawArticle.id.in_(self.raw_ids)
                ).delete(synchronize_session=False)
                
            session.commit()

    def test_pipeline_scoring_outputs_plausible_scores(self) -> None:
        from backend import database as db
        from backend.models import ProcessedArticle
        from backend.processors.cleaner import Cleaner
        from backend.processors.deduplicator import Deduplicator
        from backend.processors.analyzer import ArticleAnalyzer
        from backend.processors.scorer import score_all_articles

        Cleaner().clean_all_articles()
        Deduplicator().deduplicate_articles()
        enqueued, _raw_ids = ArticleAnalyzer().analyze_all_articles(limit=10)
        self.assertGreaterEqual(enqueued, 1)

        updated = score_all_articles()
        self.assertGreaterEqual(updated, 1)

        with db.get_session() as session:
            n_processed = session.query(ProcessedArticle).count()
            self.assertGreaterEqual(n_processed, 1)

            articles = session.query(ProcessedArticle).filter(
                ProcessedArticle.viral_score.isnot(None),
                ProcessedArticle.tech_score.isnot(None),
                ProcessedArticle.relevance_score.isnot(None)
            ).all()
            
            self.assertGreaterEqual(len(articles), 1)

            for article in articles:
                self.assertTrue(0 <= article.viral_score <= 100)
                self.assertTrue(0 <= article.tech_score <= 100)
                self.assertTrue(0 <= article.relevance_score <= 100)


if __name__ == "__main__":
    unittest.main()
