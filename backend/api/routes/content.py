from flask import Blueprint, jsonify, request
import logging
from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.db.repositories.content_repository import ContentRepository
from backend.db.repositories.media_repository import MediaRepository
from backend.db.models import ArticleAudio
from backend.api.limiter import limiter

logger = logging.getLogger(__name__)
content_bp = Blueprint('content', __name__)

@content_bp.get("/api/content/<int:article_id>/<platform>")
def get_content(article_id, platform):
    db = SessionLocal()
    try:
        repo = ContentRepository(db)
        rec = repo.get_content_record(article_id, platform)
        if not rec:
            return jsonify({"content": None, "posted": False, "posted_at": None}), 200
        return jsonify(rec), 200
    finally:
        db.close()

@content_bp.get("/api/audio/<int:article_id>")
def get_article_audio(article_id):
    """Get audio assets for an article.
    
    Note: article_id is the raw article ID from the UI, but ArticleAudio
    table references processed_articles.id, so we need to convert it.
    """
    db = SessionLocal()
    try:
        # Convert raw article ID to processed article ID
        a_repo = ArticleRepository(db)
        processed_id = a_repo.ensure_processed_id(article_id)
        
        if not processed_id:
            # Article not processed yet, return empty array
            return jsonify({"audio": []}), 200
        
        rows = (
            db.query(ArticleAudio)
            .filter(ArticleAudio.article_id == processed_id)
            .order_by(ArticleAudio.created_at.desc())
            .all()
        )
        return jsonify({
            "audio": [
                {
                    "id": r.id,
                    "article_id": r.article_id,
                    "url": r.audio_url,
                    "local_path": r.local_path,
                    "voice": r.voice,
                    "duration": r.duration,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in rows
            ]
        }), 200
    finally:
        db.close()

@content_bp.post("/api/content/posted")
def set_posted():
    db = SessionLocal()
    try:
        repo = ContentRepository(db)
        payload = request.json or {}
        article_id = int(payload.get("article_id"))
        platform = str(payload.get("platform"))
        posted = bool(payload.get("posted", True))
        updated = repo.set_posted(article_id, platform, posted)
        return jsonify({"status": "success", "record": updated}) if updated else (jsonify({"error": "Not found"}), 404)
    finally:
        db.close()

@content_bp.post("/api/generate")
@limiter.limit("10 per minute")
def generate_content():
    """Generate platform-specific content for an article.
    ---
    tags:
      - Content
    parameters:
      - in: body
        name: body
        schema:
          type: object
          required: [article_id]
          properties:
            article_id:
              type: integer
              description: Raw article ID
            platform:
              type: string
              description: Optional platform filter (e.g. twitter)
            platforms:
              type: array
              items:
                type: string
              description: Optional list of platforms to generate for
            force_regenerate:
              type: boolean
              description: If true, bypass LLM cache and force new generation
    responses:
      200:
        description: Content generated successfully
      422:
        description: Validation error
    """
    from backend.generators.generator_v5 import ContentGenerator
    from backend.api.schemas import GenerateRequest, validate_request
    obj, err = validate_request(GenerateRequest, request.json or {})
    if err:
        body, status = err
        return jsonify(body), status
    
    # Check for force_regenerate parameter
    force_regenerate = request.json.get("force_regenerate", False) if request.json else False
    
    platforms = obj.platforms  # None → ContentGenerator uses all 8 defaults
    results = ContentGenerator().generate_for_article(obj.article_id, platforms=platforms, force_regenerate=force_regenerate)
    return jsonify({"status": "success", "results": results}), 200

@content_bp.get("/api/media/assets/<int:article_id>")
def get_article_assets(article_id):
    """Get media assets for an article.
    
    Note: article_id is the raw article ID from the UI, but ArticleImage/VideoScript
    tables reference processed_articles.id, so we need to convert it.
    """
    db = SessionLocal()
    try:
        # Convert raw article ID to processed article ID
        a_repo = ArticleRepository(db)
        processed_id = a_repo.ensure_processed_id(article_id)
        
        if not processed_id:
            # Article not processed yet, return empty arrays
            return jsonify({"images": [], "video_scripts": []}), 200
        
        repo = MediaRepository(db)
        return jsonify({"images": repo.get_article_images(processed_id), "video_scripts": repo.get_video_scripts(processed_id)}), 200
    finally:
        db.close()

@content_bp.get("/api/tags/<int:article_id>")
def get_tags(article_id):
    db = SessionLocal()
    try:
        repo = ArticleRepository(db)
        tags = repo.get_tags(article_id)
        return jsonify({"tags": tags}), 200
    finally:
        db.close()

@content_bp.post("/api/tags/<int:article_id>")
def set_tags(article_id):
    db = SessionLocal()
    try:
        from backend.api.schemas import TagRequest, validate_request
        obj, err = validate_request(TagRequest, request.json or {})
        if err:
            body, status = err
            return jsonify(body), status
        repo = ArticleRepository(db)
        saved = repo.set_tags(article_id, obj.tags)
        return jsonify({"status": "success", "tags": saved}), 200
    finally:
        db.close()


def _to_bool(value) -> bool:
    """
    Convert common frontend boolean/string values to a real bool.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


@content_bp.post("/api/personalization/feedback")
def personalization_feedback():
    """
    Persist user feedback for later personalization learning.
    Expects payload from StoryCard:
      - article_id (raw article id)
      - platform
      - is_positive (bool)
      - original_content (string, optional)
      - edited_content (string, optional)
      - comment (string, optional)
    """
    db = SessionLocal()
    try:
        payload = request.json or {}
        raw_article_id = payload.get("article_id")
        platform = payload.get("platform")
        is_positive = payload.get("is_positive")

        original_content = payload.get("original_content")
        edited_content = payload.get("edited_content")
        comment = payload.get("comment")

        if raw_article_id is None or platform is None or is_positive is None:
            return jsonify({"error": "Missing required fields: article_id, platform, is_positive"}), 400

        raw_article_id = int(raw_article_id)
        platform = str(platform).strip().lower()
        is_positive_bool = _to_bool(is_positive)

        # UI uses RawArticle.id, but UserFeedback.article_id references ProcessedArticle.id.
        a_repo = ArticleRepository(db)
        processed_id = a_repo.ensure_processed_id(raw_article_id)
        if not processed_id:
            return jsonify({"error": "Article not processed yet"}), 404

        from backend.db.repositories.learning_repository import LearningRepository
        from backend.processors.personalization_engine import personalization_engine

        l_repo = LearningRepository(db)
        record = l_repo.add_feedback(
            article_id=processed_id,
            platform=platform,
            is_positive=is_positive_bool,
            comment=comment,
            original_content=original_content,
            edited_content=edited_content,
        )

        # Update learned style preferences opportunistically.
        try:
            personalization_engine.analyze_user_style()
        except Exception as e:
            # Feedback should not fail just because learning couldn't run.
            logger.warning("Personalization learning failed: %s", e)

        return jsonify({"status": "success", "record_id": record.id}), 200
    except Exception as e:
        logger.exception("Personalization feedback failed")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


# ---------------------------------------------------------------------------
# GET /api/personalization/style
# ---------------------------------------------------------------------------
# Was returning 404 because no route existed.
# Reads accumulated learned style preferences from the user_styles table.
# Returns safe defaults when no style has been learned yet so the frontend
# can always render a "writing style" panel without crashing.
# ---------------------------------------------------------------------------
_STYLE_DEFAULTS = {
    "tone": "professional",
    "length": "medium",
    "emoji_frequency": "low",
    "hashtag_style": "relevant",
    "hook_style": "question",
    "learned": False,
}

@content_bp.get("/api/personalization/style")
def get_personalization_style():
    """
    Return the current learned writing style preferences for a platform.
    Query param: ?platform=twitter (defaults to 'generic' if not specified)
    """
    db = SessionLocal()
    try:
        from backend.db.repositories.learning_repository import LearningRepository
        from backend.processors.personalization_engine import personalization_engine
        
        # Get platform from query params (default to 'generic')
        platform = request.args.get("platform", "generic").lower().strip()
        
        # Get platform-specific styles from personalization engine
        style_context = personalization_engine.get_personalization_context(platform)
        
        repo = LearningRepository(db)
        try:
            prefs = repo.get_style_preferences()
        except AttributeError:
            prefs = None

        if not prefs:
            response = {**_STYLE_DEFAULTS, "platform": platform, "context": style_context}
            return jsonify({"status": "success", "style": response}), 200

        # Merge with defaults and add platform context
        merged = {**_STYLE_DEFAULTS, **prefs, "platform": platform, "context": style_context, "learned": True}
        return jsonify({"status": "success", "style": merged}), 200
    except Exception as e:
        logger.error("Error fetching personalization style: %s", e)
        response = {**_STYLE_DEFAULTS, "platform": request.args.get("platform", "generic")}
        return jsonify({"status": "success", "style": response}), 200
    finally:
        db.close()


@content_bp.get("/api/personalization/all-platform-styles")
def get_all_platform_styles():
    """
    Return style profiles for all platforms.
    Used by Settings Hub / Style Profile component to display per-platform learning.
    """
    db = SessionLocal()
    try:
        from backend.processors.personalization_engine import personalization_engine
        
        all_platform_styles = personalization_engine.get_all_platform_styles()
        
        # Build response with all platforms
        response = {}
        for platform in ["twitter", "linkedin", "instagram", "tiktok", "youtube", "medium", "reddit", "facebook"]:
            rules = all_platform_styles.get(platform, [])
            response[platform] = {
                "learned": len(rules) > 0,
                "rules": rules,
                "sample_count": 0  # Could be enhanced to show feedback count
            }
        
        return jsonify({"status": "success", "platforms": response}), 200
    except Exception as e:
        logger.error("Error fetching all platform styles: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
    finally:
        db.close()

@content_bp.post("/api/content/quality-check")
def quality_check():
    """Run a quality check on the generated content."""
    from backend.processors.content_quality import ContentQualityAnalyzer
    try:
        data = request.json or {}
        article_id = data.get("article_id")
        content = data.get("content")
        platform = data.get("platform", "general")
        
        if not content:
            return jsonify({"error": "Content is required"}), 400
        
        analyzer = ContentQualityAnalyzer()
        metrics = analyzer.analyze_content_quality(content, platform=platform)
        recommendations = analyzer.get_quality_recommendations(metrics, platform)
        
        # Convert metrics to grade
        overall = metrics.overall_score
        if overall >= 85:
            grade = "A"
        elif overall >= 70:
            grade = "B"
        elif overall >= 55:
            grade = "C"
        else:
            grade = "D"
        
        return jsonify({
            "status": "success",
            "grade": grade,
            "metrics": {
                "overall_score": round(metrics.overall_score, 1),
                "readability_score": round(metrics.readability_score, 1),
                "engagement_potential": round(metrics.engagement_potential, 1),
                "clarity_score": round(metrics.clarity_score, 1),
                "uniqueness_score": round(metrics.uniqueness_score, 1)
            },
            "recommendations": recommendations
        }), 200
    except Exception as e:
        logger.exception("Quality check failed")
        return jsonify({"error": str(e)}), 500

@content_bp.post("/api/content/update")
def update_content():
    """Manually update generated content from the dashboard."""
    db = SessionLocal()
    try:
        data = request.json or {}
        article_id = data.get("article_id")
        platform = data.get("platform")
        content = data.get("content")
        
        if not all([article_id, platform, content]):
            return jsonify({"error": "Missing required fields"}), 400
            
        repo = ContentRepository(db)
        updated = repo.update_content(article_id, platform, content)
        
        return jsonify({"status": "success", "record": updated}), 200
    except Exception as e:
        db.rollback()
        logger.exception("Content update failed")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
