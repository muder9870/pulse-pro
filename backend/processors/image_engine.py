import os
import time
import logging
import urllib.parse
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.media_repository import MediaRepository

logger = logging.getLogger("image_engine")

# Font search paths — tried in order, first match wins
_FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",       # Debian/Ubuntu Docker
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",                 # Alpine Docker
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
    "arial.ttf",                                               # Windows
    "Arial.ttf",
]


def _load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in _FONT_PATHS:
        try:
            return ImageFont.truetype(path, size)
        except (IOError, OSError):
            continue
    # Pillow ≥ 10 requires size kwarg; older versions ignore it
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


class ImageEngine:
    def __init__(self):
        self.media_dir = settings.MEDIA_DIR
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def generate_image(self, article_id: int, prompt: str) -> str | None:
        """
        Generate an image with a 4-tier fallback chain:
          1. DALL-E 3 (if OPENAI_API_KEY set)
          2. Pollinations.ai Flux (no key, always available)
          3. HuggingFace SDXL (if HF_TOKEN set)
          4. Quote Card (PIL, always works)
        """
        # 1. DALL-E 3
        if getattr(settings, "OPENAI_API_KEY", None):
            try:
                logger.info("Attempting DALL-E 3 for article %d", article_id)
                response = requests.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={"model": "dall-e-3", "prompt": prompt, "n": 1, "size": "1024x1024"},
                    timeout=60,
                )
                response.raise_for_status()
                image_url = response.json()["data"][0]["url"]
                img_bytes = requests.get(image_url, timeout=30).content
                filename = f"article_{article_id}_dalle_{os.urandom(4).hex()}.png"
                local_path = self.media_dir / filename
                local_path.write_bytes(img_bytes)
                self._save_to_db(article_id, image_url, str(local_path), "dalle-image", prompt)
                return str(local_path)
            except Exception as e:
                logger.warning("DALL-E failed: %s", e)

        # 2. Pollinations.ai (no key required)
        try:
            logger.info("Attempting Pollinations.ai for article %d", article_id)
            result = self.generate_pollinations_image(article_id, prompt)
            if result:
                return result
        except Exception as e:
            logger.warning("Pollinations.ai failed: %s", e)

        # 3. HuggingFace SDXL
        if getattr(settings, "HF_TOKEN", None):
            try:
                logger.info("Attempting HuggingFace for article %d", article_id)
                result = self.generate_hf_image(article_id, prompt)
                if result:
                    return result
            except Exception as e:
                logger.warning("HuggingFace failed: %s", e)

        # 4. Quote Card (always works)
        try:
            logger.info("Falling back to quote card for article %d", article_id)
            db = SessionLocal()
            try:
                from backend.db.models import ProcessedArticle
                article = db.get(ProcessedArticle, article_id)
                text = (article.summary if article else None) or prompt
                title = (article.title if article else None) or "Pulse Pro Insight"
            finally:
                db.close()
            return self.generate_quote_card(article_id, text, title)
        except Exception as e:
            logger.error("Quote card failed: %s", e)

        logger.error("All image generation methods failed for article %d", article_id)
        return None

    def generate_pollinations_image(self, article_id: int, prompt: str) -> str | None:
        """Generate image via Pollinations.ai — API key required (get from enter.pollinations.ai)."""
        encoded = urllib.parse.quote(prompt[:500])
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width=1024&height=1024&model=flux&nologo=true&seed={article_id}"
        )
        
        # Add API key if available
        api_key = getattr(settings, "POLLINATIONS_API_KEY", None)
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
            url += f"&key={api_key}"
        
        response = requests.get(url, headers=headers, timeout=60)
        if response.status_code == 200 and "image" in response.headers.get("Content-Type", ""):
            filename = f"article_{article_id}_pollinations_{os.urandom(4).hex()}.jpg"
            local_path = self.media_dir / filename
            local_path.write_bytes(response.content)
            self._save_to_db(article_id, url, str(local_path), "pollinations-image", prompt)
            return str(local_path)
        logger.warning("Pollinations.ai returned %d", response.status_code)
        return None

    def generate_hf_image(self, article_id: int, prompt: str) -> str | None:
        """Generate image via HuggingFace Inference API."""
        model = getattr(settings, "HF_IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
        api_url = f"https://router.huggingface.co/hf-inference/models/{model}"
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
        max_retries, retry_delay = 3, 10

        for attempt in range(max_retries):
            try:
                response = requests.post(api_url, headers=headers, json={"inputs": prompt}, timeout=60)
                if response.status_code == 503 or (
                    response.status_code == 200 and "estimated_time" in response.text
                ):
                    logger.info("HF model loading, waiting %ds (attempt %d)", retry_delay, attempt + 1)
                    time.sleep(retry_delay)
                    continue
                if response.status_code != 200:
                    logger.warning("HF returned %d", response.status_code)
                    return None
                if "image" not in response.headers.get("Content-Type", ""):
                    logger.warning("HF returned non-image content type")
                    return None
                filename = f"article_{article_id}_hf_{os.urandom(4).hex()}.png"
                local_path = self.media_dir / filename
                local_path.write_bytes(response.content)
                self._save_to_db(article_id, None, str(local_path), "hf-image", prompt)
                return str(local_path)
            except Exception as e:
                logger.warning("HF attempt %d failed: %s", attempt + 1, e)
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
        return None

    def generate_quote_card(self, article_id: int, text: str, title: str) -> str | None:
        """Generate a professional quote card following industry best practices."""
        try:
            # Instagram-optimized square format (also works well for other platforms)
            width, height = 1080, 1080
            
            # Modern gradient background (indigo to purple)
            img = Image.new("RGB", (width, height))
            draw = ImageDraw.Draw(img)
            
            # Create gradient background
            for y in range(height):
                # Gradient from indigo-600 to purple-600
                r = int(79 + (147 - 79) * (y / height))
                g = int(70 + (51 - 70) * (y / height))
                b = int(229 + (234 - 229) * (y / height))
                draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))
            
            # Load fonts - MUCH LARGER for readability
            font_quote = _load_font(72)      # Main quote text - LARGE
            font_title = _load_font(36)      # Title/source
            font_brand = _load_font(24)      # Brand watermark
            
            # Add decorative quote mark
            quote_mark_font = _load_font(180)
            draw.text((80, 60), '"', font=quote_mark_font, fill=(255, 255, 255, 100))  # Semi-transparent
            
            # Prepare quote text - keep it SHORT (max 120 chars for readability)
            quote_text = text[:120] + "..." if len(text) > 120 else text
            
            # Word wrap for quote - max 30 chars per line for large text
            words = quote_text.split()
            lines, current = [], []
            for word in words:
                current.append(word)
                if len(" ".join(current)) > 30:
                    lines.append(" ".join(current[:-1]))
                    current = [word]
            if current:
                lines.append(" ".join(current))
            
            # Draw quote text - centered vertically with padding
            max_lines = 5  # Limit to 5 lines
            total_text_height = len(lines[:max_lines]) * 90  # 90px per line (72px font + 18px spacing)
            start_y = (height - total_text_height) // 2
            
            for i, line in enumerate(lines[:max_lines]):
                # Center each line horizontally
                bbox = draw.textbbox((0, 0), line, font=font_quote)
                text_width = bbox[2] - bbox[0]
                x = (width - text_width) // 2
                y = start_y + (i * 90)
                
                # Draw text with subtle shadow for depth
                draw.text((x + 3, y + 3), line, font=font_quote, fill=(0, 0, 0, 50))  # Shadow
                draw.text((x, y), line, font=font_quote, fill=(255, 255, 255))  # Main text
            
            # Draw title/source at bottom
            title_display = title[:60] + "..." if len(title) > 60 else title
            title_bbox = draw.textbbox((0, 0), title_display, font=font_title)
            title_width = title_bbox[2] - title_bbox[0]
            title_x = (width - title_width) // 2
            draw.text((title_x, height - 180), title_display, font=font_title, fill=(255, 255, 255, 230))
            
            # Decorative line above title
            line_width = 100
            line_x = (width - line_width) // 2
            draw.rectangle([(line_x, height - 200), (line_x + line_width, height - 196)], fill=(255, 255, 255))
            
            # Brand watermark at bottom
            brand_text = "AI Pulse Pro"
            brand_bbox = draw.textbbox((0, 0), brand_text, font=font_brand)
            brand_width = brand_bbox[2] - brand_bbox[0]
            brand_x = (width - brand_width) // 2
            draw.text((brand_x, height - 80), brand_text, font=font_brand, fill=(255, 255, 255, 180))
            
            # Save the image
            filename = f"article_{article_id}_quote_{os.urandom(4).hex()}.png"
            local_path = self.media_dir / filename
            img.save(str(local_path), quality=95, optimize=True)
            self._save_to_db(article_id, None, str(local_path), "quote-card", text[:200])
            logger.info("Quote card saved: %s", local_path)
            return str(local_path)
        except Exception as e:
            logger.error("Quote card generation failed: %s", e)
            return None

    def _save_to_db(
        self,
        article_id: int,
        image_url: str | None,
        local_path: str,
        media_type: str,
        prompt: str | None,
    ) -> None:
        db = SessionLocal()
        try:
            # article_id is processed_article_id, save it directly
            MediaRepository(db).save_image(article_id, image_url, local_path, media_type, prompt)
        except Exception as e:
            logger.error(f"Failed to save image to database: {e}")
            # Don't raise - image file is already saved, just log the DB error
        finally:
            db.close()
