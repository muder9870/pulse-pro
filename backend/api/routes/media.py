from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.media_repository import MediaRepository
from backend.db.models import ArticleImage, VideoScript
from backend.processors.image_engine import ImageEngine
import logging

logger = logging.getLogger(__name__)

media_bp = Blueprint('media', __name__)

@media_bp.get("/api/media/assets/all")
def get_all_media_assets():
    """
    Get all media assets from database with pagination.
    
    Query parameters:
    - limit: Max number of results per category (default 100)
    - offset: Number of results to skip (default 0)
    
    Returns:
    {
        "images": [{"id", "article_id", "url", "local_path", "type", "created_at"}],
        "videos": [{"id", "article_id", "platform", "script", "duration", "type", "created_at"}],
        "documents": [],
        "other": [],
        "total": total count,
        "limit": limit used,
        "offset": offset used
    }
    """
    db = SessionLocal()
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Fetch images from database
        images = db.query(ArticleImage).order_by(ArticleImage.created_at.desc()).limit(limit).offset(offset).all()
        image_list = [
            {
                "id": img.id,
                "article_id": img.article_id,
                "url": img.image_url,
                "local_path": img.local_path,
                "media_type": img.media_type,
                "prompt": img.prompt,
                "created_at": img.created_at.isoformat() if img.created_at else None,
                "type": "image"
            }
            for img in images
        ]
        
        # Fetch videos from database
        videos = db.query(VideoScript).order_by(VideoScript.created_at.desc()).limit(limit).offset(offset).all()
        video_list = [
            {
                "id": v.id,
                "article_id": v.article_id,
                "platform": v.platform,
                "script": v.script_text[:200] + "..." if v.script_text and len(v.script_text) > 200 else v.script_text,
                "visual_cues": v.visual_cues[:100] + "..." if v.visual_cues and len(v.visual_cues) > 100 else v.visual_cues,
                "duration_est": v.duration_est,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "type": "video"
            }
            for v in videos
        ]
        
        return jsonify({
            "images": image_list,
            "videos": video_list,
            "documents": [],  # Can add if DocumentAsset model exists
            "other": [],
            "total": len(image_list) + len(video_list),
            "limit": limit,
            "offset": offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching media assets: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()

@media_bp.post("/api/media/generate-image")
def generate_image():
    """Generate an AI image for an article."""
    try:
        data = request.json or {}
        article_id = data.get("article_id")
        prompt = data.get("prompt")
        
        if not article_id:
            return jsonify({"error": "article_id is required"}), 400
            
        if not prompt:
            # If no prompt provided, generate one from the article
            from backend.db.repositories.article_repo import ArticleRepository
            db = SessionLocal()
            try:
                repo = ArticleRepository(db)
                p_id = repo.ensure_processed_id(article_id)
                if not p_id:
                    return jsonify({"error": "Article not found or not processed"}), 404
                
                from backend.db.models import ProcessedArticle
                processed = db.query(ProcessedArticle).get(p_id)
                if not processed:
                    return jsonify({"error": "Processed article not found"}), 404
                
                # Simple prompt generation
                prompt = f"A professional featured image for a news article about: {processed.summary[:200]}"
            finally:
                db.close()

        engine = ImageEngine()
        image_path = engine.generate_image(int(article_id), prompt)
        
        if image_path:
            return jsonify({
                "status": "success",
                "message": "Image generated successfully",
                "image_path": image_path
            }), 200
        else:
            return jsonify({"error": "Image generation failed"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
