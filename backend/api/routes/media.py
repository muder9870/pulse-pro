from flask import Blueprint, jsonify, request, send_from_directory
from backend.db.session import SessionLocal
from backend.db.repositories.media_repository import MediaRepository
from backend.db.models import ArticleImage, VideoScript, RawArticle, ProcessedArticle
from backend.processors.image_engine import ImageEngine
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

media_bp = Blueprint('media', __name__)

@media_bp.get("/api/media/audio/<path:filename>")
def serve_audio(filename):
    """Serve audio files from the media/audio directory."""
    audio_dir = settings.MEDIA_DIR / "audio"
    return send_from_directory(str(audio_dir), filename)


@media_bp.get("/api/media/assets/all")
def get_all_media_assets():
    """
    Get all media assets from database with pagination.
    
    Query parameters:
    - limit: Max number of results per category (default 100)
    - offset: Number of results to skip (default 0)
    
    Returns:
    {
        "assets": [{"asset_type", "id", "article_id", "article_title", ...}],
        "total": total count,
        "limit": limit used,
        "offset": offset used
    }
    """
    db = SessionLocal()
    try:
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        # Fetch images with article titles
        images = db.query(
            ArticleImage, 
            RawArticle.title.label("article_title")
        ).join(
            ProcessedArticle, ArticleImage.article_id == ProcessedArticle.id
        ).join(
            RawArticle, ProcessedArticle.raw_article_id == RawArticle.id
        ).order_by(
            ArticleImage.created_at.desc()
        ).limit(limit).offset(offset).all()
        
        # Fetch videos with article titles
        videos = db.query(
            VideoScript,
            RawArticle.title.label("article_title")
        ).join(
            ProcessedArticle, VideoScript.article_id == ProcessedArticle.id
        ).join(
            RawArticle, ProcessedArticle.raw_article_id == RawArticle.id
        ).order_by(
            VideoScript.created_at.desc()
        ).limit(limit).offset(offset).all()
        
        # Combine into single assets array
        assets = []
        
        for img, article_title in images:
            assets.append({
                "asset_type": "image",
                "id": img.id,
                "article_id": img.article_id,
                "article_title": article_title,
                "image_url": img.image_url,
                "local_path": img.local_path,
                "media_type": img.media_type,
                "prompt": img.prompt,
                "created_at": img.created_at.isoformat() if img.created_at else None,
            })
        
        for v, article_title in videos:
            assets.append({
                "asset_type": "video_script",
                "id": v.id,
                "article_id": v.article_id,
                "article_title": article_title,
                "platform": v.platform,
                "script_text": v.script_text,
                "visual_cues": v.visual_cues,
                "duration_est": v.duration_est,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            })
        
        # Sort by created_at descending
        assets.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return jsonify({
            "assets": assets,
            "total": len(assets),
            "limit": limit,
            "offset": offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching media assets: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()
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
        
        # Convert raw_article_id to processed_article_id
        from backend.db.repositories.article_repo import ArticleRepository
        from backend.db.models import ProcessedArticle, RawArticle
        db = SessionLocal()
        try:
            # Check if article_id is raw or processed
            raw = db.query(RawArticle).get(article_id)
            if raw and raw.processed_entry:
                processed_id = raw.processed_entry.id
            else:
                # Try as processed_id directly
                processed = db.query(ProcessedArticle).get(article_id)
                if processed:
                    processed_id = article_id
                else:
                    return jsonify({"error": "Article not found or not processed"}), 404
            
            if not prompt:
                # Generate prompt from article
                processed = db.query(ProcessedArticle).get(processed_id)
                if not processed:
                    return jsonify({"error": "Processed article not found"}), 404
                prompt = f"A professional featured image for a news article about: {processed.summary[:200]}"
        finally:
            db.close()

        engine = ImageEngine()
        image_path = engine.generate_image(processed_id, prompt)
        
        if image_path:
            return jsonify({
                "status": "success",
                "message": "Image generated successfully",
                "image_path": image_path
            }), 200
        else:
            return jsonify({"error": "Image generation unavailable - AI providers and procedural fallback failed."}), 503
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@media_bp.post("/api/media/generate-quote-card")
def generate_quote_card():
    """Generate a quote card for an article using PIL (no API key required)."""
    try:
        data = request.json or {}
        article_id = data.get("article_id")
        
        if not article_id:
            return jsonify({"error": "article_id is required"}), 400
        
        # Get article text and title
        from backend.db.repositories.article_repo import ArticleRepository
        from backend.db.models import ProcessedArticle, RawArticle
        db = SessionLocal()
        try:
            # Check if article_id is raw or processed
            raw = db.query(RawArticle).get(article_id)
            if raw and raw.processed_entry:
                processed = raw.processed_entry
                processed_id = processed.id
                title = raw.title
            else:
                # Try as processed_id directly
                processed = db.query(ProcessedArticle).get(article_id)
                if processed:
                    processed_id = article_id
                    raw = db.query(RawArticle).get(processed.raw_article_id) if processed.raw_article_id else None
                    title = raw.title if raw else "Article"
                else:
                    return jsonify({"error": "Article not found or not processed"}), 404
            
            # Use summary or viral_hook as quote text
            text = processed.summary or processed.viral_hook or "No content available"
            
        finally:
            db.close()
        
        # Generate quote card
        engine = ImageEngine()
        image_path = engine.generate_quote_card(processed_id, text, title)
        
        if image_path:
            return jsonify({
                "status": "success",
                "message": "Quote card generated successfully",
                "image_path": image_path
            }), 200
        else:
            return jsonify({"error": "Quote card generation failed"}), 500
            
    except Exception as e:
        logger.exception("Quote card generation failed")
        return jsonify({"error": str(e)}), 500

@media_bp.post("/api/media/generate-video-script")
def generate_video_script():
    """Generate a video script for an article."""
    try:
        data = request.json or {}
        article_id = data.get("article_id")
        platform = data.get("platform", "youtube")
        
        if not article_id:
            return jsonify({"error": "article_id is required"}), 400
            
        from backend.generators.generator_v5 import ContentGenerator
        generator = ContentGenerator()
        results = generator.generate_for_article(int(article_id), platforms=[platform])
        
        return jsonify({
            "status": "success",
            "script": results.get(platform)
        }), 200
    except Exception as e:
        logger.exception("Video script generation failed")
        return jsonify({"error": str(e)}), 500

@media_bp.delete("/api/media/assets/<asset_id>")
def delete_media_asset(asset_id):
    """Delete a media asset (image or video script)."""
    try:
        # Parse asset_id format: "asset_type-id" (e.g., "image-123" or "video_script-456")
        parts = asset_id.split('-', 1)
        if len(parts) != 2:
            return jsonify({"error": "Invalid asset_id format. Expected 'type-id'"}), 400
        
        asset_type, asset_numeric_id = parts[0], parts[1]
        
        db = SessionLocal()
        try:
            if asset_type == "image":
                # Delete image from database
                image = db.query(ArticleImage).filter(ArticleImage.id == int(asset_numeric_id)).first()
                if not image:
                    return jsonify({"error": "Image not found"}), 404
                
                # Delete physical file if it exists
                if image.local_path:
                    import os
                    if os.path.exists(image.local_path):
                        try:
                            os.remove(image.local_path)
                            logger.info(f"Deleted image file: {image.local_path}")
                        except Exception as e:
                            logger.warning(f"Failed to delete image file {image.local_path}: {e}")
                
                db.delete(image)
                db.commit()
                return jsonify({"status": "success", "message": "Image deleted"}), 200
                
            elif asset_type == "video_script":
                # Delete video script from database
                script = db.query(VideoScript).filter(VideoScript.id == int(asset_numeric_id)).first()
                if not script:
                    return jsonify({"error": "Video script not found"}), 404
                
                db.delete(script)
                db.commit()
                return jsonify({"status": "success", "message": "Video script deleted"}), 200
            
            else:
                return jsonify({"error": f"Unknown asset type: {asset_type}"}), 400
                
        finally:
            db.close()
            
    except ValueError:
        return jsonify({"error": "Invalid asset ID"}), 400
    except Exception as e:
        logger.exception("Failed to delete media asset")
        return jsonify({"error": str(e)}), 500
