from flask import Blueprint, jsonify, request
from backend.db.session import SessionLocal
from backend.db.repositories.media_repository import MediaRepository
from backend.processors.image_engine import ImageEngine

media_bp = Blueprint('media', __name__)

@media_bp.get("/api/media/assets/all")
def get_all_media_assets():
    """Get all media assets."""
    db = SessionLocal()
    try:
        repo = MediaRepository(db)
        
        # For now, return empty assets list since media functionality may not be fully implemented
        # This prevents the 404 error
        assets = {
            "images": [],
            "videos": [],
            "documents": [],
            "other": []
        }
        
        return jsonify(assets), 200
        
    except Exception as e:
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
