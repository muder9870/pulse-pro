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
        """Generate image via Pollinations.ai — free, no API key required."""
        encoded = urllib.parse.quote(prompt[:500])
        url = (
            f"https://image.pollinations.ai/prompt/{encoded}"
            f"?width=1024&height=1024&model=flux&nologo=true&seed={article_id}"
        )
        response = requests.get(url, timeout=60)
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
        """Generate a styled quote card using PIL — always works, no API needed."""
        try:
            width, height = 1200, 630
            img = Image.new("RGB", (width, height), color=(30, 41, 59))  # slate-800
            draw = ImageDraw.Draw(img)

            font_title = _load_font(48)
            font_text = _load_font(32)
            font_brand = _load_font(20)

            # Title
            title_display = title[:70] + "…" if len(title) > 70 else title
            draw.text((60, 60), title_display, font=font_title, fill=(248, 250, 252))

            # Divider
            draw.rectangle([(60, 130), (200, 134)], fill=(99, 102, 241))  # indigo-500

            # Body text — word-wrap at ~65 chars
            words = text.split()
            lines, current = [], []
            for word in words:
                current.append(word)
                if len(" ".join(current)) > 65:
                    lines.append(" ".join(current[:-1]))
                    current = [word]
            if current:
                lines.append(" ".join(current))

            y = 160
            for line in lines[:8]:
                draw.text((60, y), line, font=font_text, fill=(203, 213, 225))
                y += 48

            # Brand watermark
            draw.text((60, height - 50), "AI Pulse Pro", font=font_brand, fill=(99, 102, 241))

            filename = f"article_{article_id}_quote_{os.urandom(4).hex()}.png"
            local_path = self.media_dir / filename
            img.save(str(local_path))
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
            MediaRepository(db).save_image(article_id, image_url, local_path, media_type, prompt)
        finally:
            db.close()
