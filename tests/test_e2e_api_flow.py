from __future__ import annotations

import os
import unittest


class ApiE2ETests(unittest.TestCase):
    def setUp(self) -> None:
        os.environ["DISABLE_SCHEDULER"] = "1"

        from backend import database as db
        from backend.config import settings
        from backend.models import RawArticle, ProcessedArticle, ArticleTag
        import time

        settings.LLM_PROVIDER = "local"
        
        # Use timestamp to make URLs unique across test runs
        timestamp = str(int(time.time() * 1000))
        
        # Use ORM to insert test data
        with db.get_session() as session:
            # Create raw article
            raw_article = RawArticle(
                title='E2E Article',
                url=f'https://example.com/e2e-{timestamp}',
                source='arxiv',
                category='cs.AI',
                raw_content='Raw',
                processed=1,
                is_duplicate=0
            )
            session.add(raw_article)
            session.flush()  # Ensure raw_article.id is available
            
            # Store IDs for cleanup
            self.raw_ids = [raw_article.id]
            
            # Create processed article
            processed_article = ProcessedArticle(
                raw_article_id=raw_article.id,
                summary='Summary',
                key_takeaways='Takeaways',
                viral_score=60,
                tech_score=50,
                relevance_score=40
            )
            session.add(processed_article)
            session.flush()
            
            # Store processed ID for cleanup
            self.proc_ids = [processed_article.id]
            
            # Create article tags
            tag1 = ArticleTag(article_id=processed_article.id, tag='AI')
            tag2 = ArticleTag(article_id=processed_article.id, tag='Agents')
            session.add(tag1)
            session.add(tag2)
            session.commit()

        from backend.main import create_app

        self.app = create_app()
        self.client = self.app.test_client()

    def tearDown(self) -> None:
        """Clean up test database."""
        from backend import database as db
        from backend.models import RawArticle, ProcessedArticle, ArticleTag, ArticleImage, GeneratedContent, BlogPost
        
        # Clean up test data - delete in correct order to respect foreign keys
        with db.get_session() as session:
            # Delete related records first
            if hasattr(self, 'proc_ids'):
                # Delete blog posts
                session.query(BlogPost).filter(
                    BlogPost.article_id.in_(self.proc_ids)
                ).delete(synchronize_session=False)
                
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

    def test_full_api_flow(self) -> None:
        r = self.client.get("/api/health")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json.get("status"), "ok")

        stories = self.client.get("/api/stories")
        self.assertEqual(stories.status_code, 200)
        self.assertIsInstance(stories.json, list)
        self.assertGreaterEqual(len(stories.json), 1)
        article_id = int(stories.json[0]["id"])

        gen = self.client.post("/api/generate", json={"article_id": article_id, "platforms": ["twitter"]})
        self.assertEqual(gen.status_code, 200)

        content = self.client.get(f"/api/content/{article_id}/twitter")
        self.assertEqual(content.status_code, 200)
        self.assertTrue(content.json.get("content"))

        upd = self.client.post("/api/hashtags/update", json={})
        self.assertEqual(upd.status_code, 200)

        tags = self.client.get(f"/api/hashtags/{article_id}/twitter")
        self.assertEqual(tags.status_code, 200)
        self.assertIn("hashtags", tags.json)

        blog = self.client.get(f"/api/blog/generate/{article_id}?regenerate=1")
        self.assertEqual(blog.status_code, 200)
        post = blog.json.get("blog_post") or {}
        self.assertTrue(post.get("content"))
        self.assertTrue(post.get("meta_description") is not None)
        blog_post_id = int(post.get("id"))

        cred = self.client.post("/api/blog/credentials/devto", json={"enabled": False})
        self.assertEqual(cred.status_code, 200)

        v = self.client.post("/api/blog/credentials/validate/devto", json={})
        self.assertEqual(v.status_code, 200)
        self.assertFalse(bool(v.json.get("valid")))

        batch = self.client.post(
            "/api/blog/publish/batch",
            json={"blog_post_id": blog_post_id, "platforms": ["devto"], "published": False},
        )
        self.assertIn(batch.status_code, {200, 207})

        export = self.client.get("/api/export")
        self.assertEqual(export.status_code, 200)


if __name__ == "__main__":
    unittest.main()
