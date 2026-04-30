from flask import Blueprint, jsonify, request
import logging
from backend.db.session import SessionLocal

podcast_bp = Blueprint("podcast", __name__)
logger = logging.getLogger(__name__)


@podcast_bp.get("/api/podcast/latest")
def get_latest_podcast():
    """Get the most recently generated podcast digest from the DB."""
    db = SessionLocal()
    try:
        from backend.models import ArticleAudio
        latest = (
            db.query(ArticleAudio)
            .filter(ArticleAudio.audio_url.like("%podcast_digest%"))
            .order_by(ArticleAudio.created_at.desc())
            .first()
        )
        if not latest:
            return jsonify({"podcast": None}), 200

        return jsonify({
            "podcast": {
                "audio_url": latest.audio_url,
                "created_at": latest.created_at.isoformat() if latest.created_at else None,
                "title": "Daily AI Pulse Digest",
            }
        }), 200
    except Exception as e:
        logger.error("Error fetching latest podcast: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@podcast_bp.post("/api/generate/podcast")
def generate_podcast_endpoint():
    """
    Trigger podcast generation.

    Body (optional):
      { "article_ids": [1, 2, 3], "limit": 5 }

    If article_ids is provided, uses those specific articles.
    If article_ids contains a single article, generates a per-article podcast.
    Otherwise uses top N articles by score (default 5) for a daily digest.
    """
    try:
        data = request.json or {}
        article_ids = data.get("article_ids") or None
        limit = int(data.get("limit", 5))

        from backend.generators.podcast_generator import PodcastGenerator
        generator = PodcastGenerator()
        
        # If single article, generate per-article podcast
        if article_ids and len(article_ids) == 1:
            path = generator.generate_article_podcast_sync(article_ids[0])
        else:
            # Generate daily digest
            path = generator.generate_daily_digest_sync(article_ids=article_ids, limit=limit)

        if path:
            return jsonify({
                "status": "success",
                "message": "Podcast generated successfully",
                "path": path,
            }), 200
        return jsonify({"error": "Podcast generation failed — no stories or engine error"}), 500
    except Exception as e:
        logger.exception("Podcast generation failed")
        return jsonify({"error": str(e)}), 500
