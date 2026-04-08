import asyncio
import edge_tts
import os
import logging
from pathlib import Path
from backend.config import settings
from backend.db.session import SessionLocal
from backend.models import ArticleAudio

class AudioEngine:
    """TTS Engine using edge-tts for high-quality, free speech synthesis."""
    
    def __init__(self, voice: str = "en-US-GuyNeural"):
        self.voice = voice
        self.audio_dir = settings.MEDIA_DIR / "audio"
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.log = logging.getLogger("audio_engine")

    async def generate_audio(self, article_id: int, text: str, filename: str = None) -> str | None:
        """Generate an MP3 from text for a specific article."""
        if not text:
            self.log.warning("No text provided for audio generation article_id=%s", article_id)
            return None
            
        if filename is None:
            filename = f"article_{article_id}_{os.urandom(4).hex()}.mp3"
            
        local_path = self.audio_dir / filename
        
        try:
            self.log.info("Generating audio article_id=%s voice=%s path=%s", article_id, self.voice, local_path)
            communicate = edge_tts.Communicate(text, self.voice)
            await communicate.save(local_path)
            
            # Save to database
            db = SessionLocal()
            try:
                audio = ArticleAudio(
                    article_id=article_id,
                    audio_url=f"/media/audio/{filename}",
                    local_path=str(local_path),
                    voice=self.voice
                )
                db.add(audio)
                db.commit()
            finally:
                db.close()
                
            return str(local_path)
        except Exception as e:
            self.log.error("Failed to generate audio article_id=%s error=%s", article_id, e)
            return None

    def generate_audio_sync(self, article_id: int, text: str) -> str | None:
        """Synchronous wrapper for generate_audio."""
        try:
            return asyncio.run(self.generate_audio(article_id, text))
        except Exception as e:
            self.log.error("Sync audio generation failed article_id=%s error=%s", article_id, e)
            return None

# Simple test runner
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = AudioEngine()
    test_text = "This is a test of the Pulse Pro audio engine. AI content is now audible."
    path = engine.generate_audio_sync(0, test_text)
    print(f"Test audio generated: {path}")
