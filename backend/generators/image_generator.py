import os
import logging
import requests
import json
from datetime import datetime
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.models import ArticleImage
from backend.processors.style_mapper import style_mapper

log = logging.getLogger("image_generator")

class ImageGenerator:
    """Generates featured images for articles using AI services."""

    def __init__(self):
        self.output_dir = os.path.join(settings.DATA_DIR, "media", "images")
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_featured_image(self, article_id: int, prompt: str, category: str = None, title: str = "") -> str | None:
        """Generate an image based on a prompt and save it locally."""
        # Resolve to ProcessedArticle.id
        db = SessionLocal()
        try:
            a_repo = ArticleRepository(db)
            p_id = a_repo.ensure_processed_id(article_id)
        finally:
            db.close()
            
        if not p_id:
            log.warning(f"Cannot generate image: article_id {article_id} not processed.")
            return None
            
        # Phase 4: Artistic Style Mapping
        style_suffix = style_mapper.get_style_suffix(category, title)
        final_prompt = f"{prompt}{style_suffix}"
        
        log.info("generate_featured_image article_id=%d prompt=%s", p_id, final_prompt)
        
        # In a real implementation, we would call DALL-E or a local Stable Diffusion instance.
        # For now, we'll use a placeholder or a free service like pollations.ai if available,
        # otherwise we'll return a placeholder path and log the mock action.
        
        filename = f"article_{article_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            # Simple mock generation logic
            # In production, replace with actual API call
            log.info("dispatching_image_generation_request prompt=%s", prompt)
            
            # Simulated delay/action
            # For demonstration, we'll "save" a mock file if it doesn't exist
            if not os.path.exists(filepath):
                with open(filepath, "wb") as f:
                    f.write(b"MOCK_IMAGE_DATA")
            
            self._save_to_db(p_id, prompt, filepath)
            return filepath
            
        except Exception as e:
            log.error("image_generation_failed error=%s", e)
            return None

    def _save_to_db(self, article_id: int, prompt: str, filepath: str) -> None:
        """Save image metadata to article_images table."""
        db = SessionLocal()
        try:
            image = ArticleImage(
                article_id=article_id,
                image_url=f"/media/images/{os.path.basename(filepath)}",
                local_path=filepath,
                media_type="dalle-image",
                prompt=prompt
            )
            db.add(image)
            db.commit()
        finally:
            db.close()

image_generator = ImageGenerator()
