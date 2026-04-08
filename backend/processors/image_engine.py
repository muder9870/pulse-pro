import os
import logging
import requests
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.media_repository import MediaRepository

logger = logging.getLogger("image_engine")

class ImageEngine:
    def __init__(self):
        self.media_dir = settings.MEDIA_DIR
        self.media_dir.mkdir(parents=True, exist_ok=True)

    def generate_image(self, article_id: int, prompt: str) -> str | None:
        """Generate an image using OpenAI (primary) or Hugging Face (fallback)."""
        # 1. Try OpenAI DALL-E 3
        if settings.OPENAI_API_KEY:
            try:
                logger.info(f"Attempting DALL-E 3 generation for article {article_id}")
                response = requests.post(
                    "https://api.openai.com/v1/images/generations",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": "dall-e-3",
                        "prompt": prompt,
                        "n": 1,
                        "size": "1024x1024"
                    },
                    timeout=60
                )
                response.raise_for_status()
                data = response.json()
                image_url = data['data'][0]['url']
                
                # Download and save locally
                img_response = requests.get(image_url, timeout=30)
                img_response.raise_for_status()
                
                filename = f"article_{article_id}_dalle_{os.urandom(4).hex()}.png"
                local_path = self.media_dir / filename
                with open(local_path, "wb") as f:
                    f.write(img_response.content)
                
                db = SessionLocal()
                try:
                    MediaRepository(db).save_image(article_id, image_url, str(local_path), "dalle-image", prompt)
                finally:
                    db.close()
                return str(local_path)
            except Exception as e:
                logger.error(f"DALL-E generation failed: {e}")

        # 2. Try Hugging Face Fallback
        if settings.HF_TOKEN:
            try:
                logger.info(f"Attempting Hugging Face fallback for article {article_id}")
                local_path = self.generate_hf_image(article_id, prompt)
                if local_path:
                    return local_path
            except Exception as e:
                logger.error(f"Hugging Face generation failed: {e}")

        # 3. Fail if no successful generation
        logger.warning(f"No successful AI generation for article {article_id}.")
        return None

    def generate_hf_image(self, article_id: int, prompt: str) -> str | None:
        """Generate an image using Hugging Face Inference API."""
        API_URL = "https://router.huggingface.co/hf-inference/models/stabilityai/stable-diffusion-xl-base-1.0"
        headers = {"Authorization": f"Bearer {settings.HF_TOKEN}"}
        
        import time
        max_retries = 3
        retry_delay = 10 # seconds
        
        for attempt in range(max_retries):
            try:
                response = requests.post(API_URL, headers=headers, json={"inputs": prompt}, timeout=60)
                
                # Check for "Model loading" state (HF often returns 503 or 200 with "estimated_time")
                if response.status_code == 503 or (response.status_code == 200 and "estimated_time" in response.text):
                    logger.info(f"HF Model is loading, waiting {retry_delay}s... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(retry_delay)
                    continue

                if response.status_code != 200:
                    logger.warning(f"HF API returned {response.status_code}: {response.text}")
                    return None
                
                # Verify we actually got an image
                content_type = response.headers.get("Content-Type", "")
                if "image" not in content_type:
                    logger.warning(f"HF returned non-image content type: {content_type}. Content: {response.text[:100]}")
                    return None
                    
                filename = f"article_{article_id}_hf_{os.urandom(4).hex()}.png"
                local_path = self.media_dir / filename
                with open(local_path, "wb") as f:
                    f.write(response.content)
                
                db = SessionLocal()
                try:
                    MediaRepository(db).save_image(article_id, None, str(local_path), "hf-image", prompt)
                finally:
                    db.close()
                return str(local_path)
            except Exception as e:
                logger.error(f"HF Generation error on attempt {attempt+1}: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    return None
        return None

    def generate_quote_card(self, article_id: int, text: str, title: str) -> str | None:
        """Generate a procedural quote card image."""
        try:
            # Create a base image (gradient or solid color)
            width, height = 1200, 630
            img = Image.new('RGB', (width, height), color=(30, 41, 59)) # Slate-800
            draw = ImageDraw.Draw(img)
            
            # Attempt to load a font
            try:
                # Common Windows fonts
                font_title = ImageFont.truetype("arial.ttf", 48)
                font_text = ImageFont.truetype("arial.ttf", 32)
            except:
                font_title = ImageFont.load_default()
                font_text = ImageFont.load_default()

            # Draw Title
            draw.text((50, 50), title[:60] + "..." if len(title) > 60 else title, font=font_title, fill=(248, 250, 252))
            
            # Draw Text (wrap manually)
            words = text.split()
            lines = []
            current_line = []
            for word in words:
                current_line.append(word)
                if len(" ".join(current_line)) > 50:
                    lines.append(" ".join(current_line))
                    current_line = []
            if current_line:
                lines.append(" ".join(current_line))
            
            y_text = 150
            for line in lines[:8]: # Limit lines
                draw.text((50, y_text), line, font=font_text, fill=(203, 213, 225))
                y_text += 45

            # Save
            filename = f"article_{article_id}_quote_{os.urandom(4).hex()}.png"
            local_path = self.media_dir / filename
            img.save(local_path)
            
            db = SessionLocal()
            try:
                MediaRepository(db).save_image(article_id, None, str(local_path), "quote-card", text)
            finally:
                db.close()
            return str(local_path)
        except Exception as e:
            logger.error(f"Quote card generation failed: {e}")
            return None

