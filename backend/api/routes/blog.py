from flask import Blueprint, jsonify, request, send_file
import logging
import requests
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
    """
    Publish a blog post to real platforms.
    
    Request body:
    {
        "blog_post_id": 123,
        "platform": "devto" | "medium" | "wordpress",
        "published": true/false
    }
    
    Returns:
    {
        "status": "published" | "draft" | "error" | "disabled",
        "platform": "devto" | "medium" | "wordpress",
        "post_url": "https://...",
        "post_id": "12345",
        "verified": true/false,
        "error": "error message or null"
    }
    """
    import signal
    import time
    
    def timeout_handler(signum, frame):
        raise TimeoutError("Publishing timeout after 10 seconds")
    
    data = request.json or {}
    blog_post_id = data.get("blog_post_id")
    platform = (data.get("platform") or "").lower()
    published = data.get("published", False)
    
    if not blog_post_id or not platform:
        return jsonify({
            "status": "error",
            "error": "blog_post_id and platform required"
        }), 400
    
    db = SessionLocal()
    try:
        repo = BlogRepository(db)
        blog_post = repo.get_post(blog_post_id)
        
        if not blog_post:
            return jsonify({
                "status": "error",
                "error": f"Blog post {blog_post_id} not found"
            }), 404
        
        title = blog_post.get("title", "Untitled")
        content = blog_post.get("content", "")
        
        # Set timeout and call appropriate publisher
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        try:
            signal.alarm(10)  # 10 second timeout
            
            if platform == "devto":
                from backend.generators.blog_publishers import devto_publisher
                tags = blog_post.get("tags", "").split(",") if blog_post.get("tags") else []
                result = devto_publisher.publish_markdown(
                    title=title,
                    body_markdown=content,
                    tags=tags,
                    published=published
                )
                
                return jsonify({
                    "status": result.status,
                    "platform": "devto",
                    "post_url": result.url,
                    "post_id": result.platform_post_id,
                    "verified": result.status in ("published", "draft"),
                    "error": result.error
                }), (200 if result.status in ("published", "draft") else 400)
            
            elif platform == "medium":
                from backend.generators.blog_publishers import medium_publisher
                tags = blog_post.get("tags", "").split(",") if blog_post.get("tags") else []
                result = medium_publisher.publish_markdown(
                    title=title,
                    body_markdown=content,
                    tags=tags,
                    published=published
                )
                
                return jsonify({
                    "status": result.status,
                    "platform": "medium",
                    "post_url": result.url,
                    "post_id": result.platform_post_id,
                    "verified": result.status in ("published", "draft"),
                    "error": result.error
                }), (200 if result.status in ("published", "draft") else 400)
            
            elif platform == "wordpress":
                from backend.generators.blog_publishers import wordpress_publisher
                cred = repo.get_credential("wordpress") or {}
                site_url = cred.get("site_url")
                
                if not site_url:
                    return jsonify({
                        "status": "error",
                        "platform": "wordpress",
                        "error": "WordPress site_url not configured"
                    }), 400
                
                result = wordpress_publisher.publish_markdown(
                    title=title,
                    body_markdown=content,
                    site_url=site_url,
                    published=published
                )
                
                return jsonify({
                    "status": result.status,
                    "platform": "wordpress",
                    "post_url": result.url,
                    "post_id": result.platform_post_id,
                    "verified": result.status in ("published", "draft"),
                    "error": result.error
                }), (200 if result.status in ("published", "draft") else 400)
            
            else:
                return jsonify({
                    "status": "error",
                    "error": f"Unknown platform: {platform}. Supported: devto, medium, wordpress"
                }), 400
        
        finally:
            signal.alarm(0)  # Cancel alarm
            signal.signal(signal.SIGALRM, old_handler)
    
    except TimeoutError as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 408
    except Exception as e:
        logger.error(f"Blog publish error: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "error": f"Publishing error: {str(e)}"
        }), 500
    finally:
        db.close()


@blog_bp.post("/api/blog/credentials/validate/<platform>")
def validate_credentials(platform):
    """Validate blog platform credentials by testing API connection."""
    data = request.json or {}
    api_key = data.get('api_key', '').strip()
    
    if not api_key:
        return jsonify({
            "valid": False,
            "error": "API key required"
        }), 400
    
    try:
        if platform.lower() == 'devto':
            # Test Dev.to API
            resp = requests.get(
                'https://dev.to/api/user',
                headers={'api-key': api_key},
                timeout=5
            )
            if resp.status_code == 200:
                return jsonify({
                    "valid": True,
                    "message": "Dev.to credentials valid"
                }), 200
            else:
                return jsonify({
                    "valid": False, 
                    "error": f"Dev.to API returned {resp.status_code}: {resp.text[:200]}"
                }), 400
        
        elif platform.lower() == 'medium':
            # Test Medium API
            resp = requests.get(
                'https://api.medium.com/v1/me',
                headers={'Authorization': f'Bearer {api_key}'},
                timeout=5
            )
            if resp.status_code == 200:
                return jsonify({
                    "valid": True,
                    "message": "Medium credentials valid"
                }), 200
            else:
                return jsonify({
                    "valid": False,
                    "error": f"Medium API returned {resp.status_code}"
                }), 400
        
        elif platform.lower() == 'wordpress':
            # Test WordPress API
            site_url = data.get('site_url', '').strip()
            username = data.get('username', '').strip()
            if not all([site_url, username]):
                return jsonify({
                    "valid": False,
                    "error": "site_url and username required"
                }), 400
            
            resp = requests.get(
                f'{site_url}/wp-json/wp/v2/users/me',
                auth=(username, api_key),
                timeout=5
            )
            if resp.status_code == 200:
                return jsonify({
                    "valid": True,
                    "message": "WordPress credentials valid"
                }), 200
            else:
                return jsonify({
                    "valid": False,
                    "error": f"WordPress returned {resp.status_code}"
                }), 400
        
        else:
            return jsonify({
                "valid": False,
                "error": f"Unknown platform: {platform}"
            }), 400
            
    except requests.Timeout:
        return jsonify({
            "valid": False,
            "error": "API request timed out. Check connectivity."
        }), 400
    except Exception as e:
        return jsonify({
            "valid": False,
            "error": f"Validation error: {str(e)}"
        }), 500
