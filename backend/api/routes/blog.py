from flask import Blueprint, jsonify, request, send_file
import logging
from backend.db.session import SessionLocal
from backend.db.repositories.blog_repository import BlogRepository
from backend.config import settings

logger = logging.getLogger(__name__)
blog_bp = Blueprint('blog', __name__)

@blog_bp.get("/api/blog/generate/<int:article_id>")
def blog_generate(article_id: int):
    from backend.generators.blog_generator import BlogPostGenerator
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        regenerate = request.args.get("regenerate") in {"1", "true", "yes"}
        existing = repo.get_post_by_article(article_id)
        if existing and not regenerate:
            pubs = repo.list_publications(int(existing["id"]))
            return jsonify({"status": "success", "blog_post": existing, "publications": pubs}), 200

        draft = BlogPostGenerator().generate_for_article(article_id)
        saved = repo.upsert_post(
            article_id=draft.article_id,
            title=draft.title,
            slug=draft.slug,
            content=draft.content,
            excerpt=draft.excerpt,
            focus_keyword=draft.focus_keyword,
            meta_description=draft.meta_description,
            readability_score=draft.readability_score,
            platform_slugs=draft.platform_slugs_json,
            alt_text_suggestions=draft.alt_text_suggestions_json,
            word_count=draft.word_count,
            reading_time=draft.reading_time,
            status="draft",
        )
        pubs = repo.list_publications(int(saved["id"])) if saved and saved.get("id") else []
        return jsonify({"status": "success", "blog_post": saved, "publications": pubs}), 200
    except Exception as e:
        logger.error(f"Blog generation error: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@blog_bp.get("/api/blog/posts")
def blog_posts():
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        posts = repo.list_posts(limit=50)
        return jsonify({"status": "success", "blog_posts": posts}), 200
    finally:
        db.close()

@blog_bp.get("/api/blog/<int:blog_post_id>")
def blog_get(blog_post_id: int):
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        post = repo.get_post(blog_post_id)
        if not post:
            return jsonify({"error": "Blog post not found"}), 404
        pubs = repo.list_publications(blog_post_id)
        return jsonify({"status": "success", "blog_post": post, "publications": pubs}), 200
    finally:
        db.close()

@blog_bp.post("/api/blog/update")
def blog_update():
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        payload = request.json or {}
        blog_post_id = int(payload.get("blog_post_id"))
        content = str(payload.get("content"))
        updated = repo.update_blog_post_content(blog_post_id, content, payload.get("excerpt"), payload.get("focus_keyword"))
        if not updated:
            return jsonify({"error": "Blog post not found"}), 404
        return jsonify({"status": "success", "blog_post": updated}), 200
    finally:
        db.close()

@blog_bp.post("/api/blog/publish")
def blog_publish():
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        payload = request.json or {}
        blog_post_id = int(payload.get("blog_post_id"))
        platform = str(payload.get("platform"))
        published = bool(payload.get("published", False))

        post = repo.get_post(blog_post_id)
        if not post: return jsonify({"error": "Not found"}), 404

        return jsonify({"status": "success", "info": "Post queued for publishing"}), 200
    finally:
        db.close()
