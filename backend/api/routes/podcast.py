from flask import Blueprint, jsonify, request
import logging
from backend.db.session import SessionLocal
from backend.generators.podcast_generator import PodcastGenerator

podcast_bp = Blueprint('podcast', __name__)
logger = logging.getLogger(__name__)

@podcast_bp.get("/api/podcast/latest")
def get_latest_podcast():
    """Get the most recently generated podcast digest."""
    # Note: In a real app, you'd fetch this from a 'podcasts' table.
    # For now, we simulate by checking the data/audio directory or a system prefernce.
    # To keep it robust, let's use the local file system check for now if no DB table exists.
    try:
        import os
        from datetime import datetime
        audio_dir = "data/audio"
        if not os.path.exists(audio_dir):
            return jsonify({"podcast": None}), 200
            
        files = [f for f in os.listdir(audio_dir) if f.startswith("podcast_digest_") and f.endswith(".mp3")]
        if not files:
            return jsonify({"podcast": None}), 200
            
        files.sort(reverse=True)
        latest_file = files[0]
        
        # Extract date from filename: podcast_digest_20260410_123456.mp3
        try:
            date_str = latest_file.split("_")[2] + "_" + latest_file.split("_")[3].split(".")[0]
            created_at = datetime.strptime(date_str, "%Y%m%d_%H%M%S").isoformat()
        except:
            created_at = datetime.now().isoformat()

        return jsonify({
            "podcast": {
                "audio_url": f"/api/media/audio/{latest_file}",
                "created_at": created_at,
                "title": "Daily AI Pulse Digest"
            }
        }), 200
    except Exception as e:
        logger.error(f"Error fetching latest podcast: {e}")
        return jsonify({"error": str(e)}), 500

@podcast_bp.post("/api/generate/podcast")
def generate_podcast_endpoint():
    """Trigger the generation of a new podcast digest."""
    try:
        generator = PodcastGenerator()
        # This is async in the class, but we have a sync wrapper
        path = generator.generate_daily_digest_sync()
        
        if path:
            return jsonify({
                "status": "success",
                "message": "Podcast generated successfully",
                "path": path
            }), 200
        else:
            return jsonify({"error": "Podcast generation failed - no stories found or engine error"}), 500
    except Exception as e:
        logger.exception("Podcast generation failed")
        return jsonify({"error": str(e)}), 500
