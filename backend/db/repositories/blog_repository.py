from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import BlogPost, BlogCredential, BlogPublication
from backend.db.repositories.article_repository import ArticleRepository

class BlogRepository:
    def __init__(self, session: Session):
        self.session = session
        self.article_repo = ArticleRepository(session)

    def get_post_by_article(self, article_id: int) -> dict | None:
        post = self.session.query(BlogPost).filter(BlogPost.article_id == article_id).first()
        if not post: return None
        return self._to_dict(post)

    def get_post(self, blog_post_id: int) -> dict | None:
        post = self.session.query(BlogPost).filter(BlogPost.id == blog_post_id).first()
        if not post: return None
        return self._to_dict(post)

    def upsert_post(self, article_id: int, **kwargs) -> dict:
        p_id = self.article_repo.ensure_processed_id(article_id)
        if not p_id: raise ValueError(f"Article {article_id} not processed.")
        
        post = self.session.query(BlogPost).filter(BlogPost.article_id == p_id).first()
        if post:
            for k, v in kwargs.items():
                if hasattr(post, k): setattr(post, k, v)
            post.updated_at = datetime.now(timezone.utc)
        else:
            post = BlogPost(article_id=p_id, **kwargs)
            self.session.add(post)
        self.session.commit()
        return self._to_dict(post)

    def list_posts(self, limit: int = 50) -> list[dict]:
        posts = self.session.query(BlogPost).order_by(BlogPost.created_at.desc()).limit(limit).all()
        return [{"id": p.id, "article_id": p.article_id, "title": p.title, "slug": p.slug, "status": p.status} for p in posts]

    def get_credential(self, platform: str) -> dict | None:
        cred = self.session.query(BlogCredential).filter(BlogCredential.platform == platform).first()
        if not cred: return None
        return {
            "platform": cred.platform,
            "api_key": cred.api_key,
            "site_url": cred.site_url,
            "username": cred.username,
            "enabled": bool(cred.enabled),
            "updated_at": cred.updated_at,
        }

    def upsert_credential(self, platform: str, **kwargs) -> dict:
        cred = self.session.query(BlogCredential).filter(BlogCredential.platform == platform).first()
        if cred:
            for k, v in kwargs.items():
                if hasattr(cred, k): setattr(cred, k, v)
            cred.updated_at = datetime.now(timezone.utc)
        else:
            cred = BlogCredential(platform=platform, **kwargs)
            self.session.add(cred)
        self.session.commit()
        return self.get_credential(platform)

    def list_publications(self, blog_post_id: int) -> list[dict]:
        pubs = self.session.query(BlogPublication).filter(BlogPublication.blog_post_id == blog_post_id).all()
        return [{
            "id": p.id,
            "platform": p.platform,
            "status": p.status,
            "url": p.url,
            "platform_post_id": p.platform_post_id,
            "error_message": p.error_message,
        } for p in pubs]

    def add_publication(self, blog_post_id: int, platform: str, status: str, **kwargs) -> dict:
        pub = BlogPublication(blog_post_id=blog_post_id, platform=platform, status=status, **kwargs)
        self.session.add(pub)
        self.session.commit()
        return {
            "id": pub.id,
            "platform": pub.platform,
            "status": pub.status,
            "url": pub.url
        }

    def _to_dict(self, post: BlogPost) -> dict:
        return {
            "id": post.id,
            "article_id": post.article_id,
            "title": post.title,
            "slug": post.slug,
            "content": post.content,
            "excerpt": post.excerpt,
            "focus_keyword": post.focus_keyword,
            "status": post.status,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
        }
