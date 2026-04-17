import asyncio
import concurrent.futures
import urllib.parse
import os
import logging
import requests
from pathlib import Path
from backend.config import settings
from backend.db.session import SessionLocal
from backend.models import ArticleAudio


class AudioEngine:
    """TTS engine — edge-tts primary, Pollinations.ai ElevenLabs fallback."""

    def __init__(self, voice: str = "en-US-GuyNeural"):
        self.voice = voice
        self.audio_dir = settings.MEDIA_DIR / "audio"
        self.audio_dir.mkdir(parents=True, exist_ok=True)
        self.log = logging.getLogger("audio_engine")

    def _run_async(self, coro):
        """Run a coroutine safely regardless of whether an event loop is running."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(asyncio.run, coro).result()
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    async def generate_audio(
        self, article_id: int | None, text: str, filename: str | None = None
    ) -> str | None:
        """Generate MP3 from text. Tries edge-tts first, Google TTS as fallback."""
        import re
        if not text or not text.strip():
            self.log.warning("No text provided for audio generation article_id=%s", article_id)
            return None

        if filename is None:
            id_str = article_id if article_id is not None else "gen"
            filename = f"article_{id_str}_{os.urandom(4).hex()}.mp3"

        local_path = self.audio_dir / filename
        
        # Clean markdown to prevent edge-tts NoAudioReceived crashes
        clean_text = re.sub(r'[*#_~`\[\]]+', ' ', text)
        clean_text = " ".join(clean_text.split())

        # 1. Try edge-tts (free, Microsoft neural voices)
        try:
            import edge_tts
            self.log.info(
                "Generating audio via edge-tts article_id=%s voice=%s", article_id, self.voice
            )
            communicate = edge_tts.Communicate(clean_text, self.voice)
            await communicate.save(str(local_path))
            self._save_to_db(article_id, filename, local_path)
            return str(local_path)
        except Exception as e:
            self.log.warning("edge-tts failed: %s — trying Google TTS", e)

        # 2. Fallback: Google Translate TTS (free, no API key, requires chunking)
        try:
            audio_bytes = self._google_tts(clean_text)
            if audio_bytes:
                local_path.write_bytes(audio_bytes)
                self._save_to_db(article_id, filename, local_path)
                self.log.info("Audio generated via Google TTS article_id=%s", article_id)
                return str(local_path)
        except Exception as e:
            self.log.error("Google TTS failed: %s", e)

        self.log.error("All TTS methods failed for article_id=%s", article_id)
        return None

    def _google_tts(self, text: str) -> bytes | None:
        """Call Google Translate TTS — chunks text and concatenates audio bytes."""
        import urllib.parse
        import requests
        import re
        
        # Chunking by 150 chars max, respecting word boundaries
        chunks = []
        for sentence in re.findall(r'[^.?!]+[.?!]*', text):
            sentence = sentence.strip()
            while len(sentence) > 150:
                idx = sentence.rfind(' ', 0, 150)
                if idx == -1:  # No spaces found
                    idx = 150
                chunks.append(sentence[:idx].strip())
                sentence = sentence[idx:].strip()
            if sentence:
                chunks.append(sentence)
                
        audio_bytes = b""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        
        for chunk in chunks:
            if not chunk:
                continue
            encoded = urllib.parse.quote(chunk)
            url = f"http://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q={encoded}"
            response = requests.get(url, headers=headers, timeout=15)
            if response.status_code == 200 and len(response.content) > 100:
                audio_bytes += response.content
            else:
                self.log.warning("Google TTS chunk failed %d", response.status_code)
                
        return audio_bytes if audio_bytes else None

    def _save_to_db(self, article_id: int | None, filename: str, local_path: Path) -> None:
        db = SessionLocal()
        try:
            audio = ArticleAudio(
                article_id=article_id,
                audio_url=f"/api/media/audio/{filename}",
                local_path=str(local_path),
                voice=self.voice,
            )
            db.add(audio)
            db.commit()
        except Exception as e:
            self.log.warning("Failed to save audio to DB: %s", e)
            db.rollback()
        finally:
            db.close()

    def generate_audio_sync(self, article_id: int | None, text: str) -> str | None:
        """Synchronous wrapper — safe to call from Celery workers."""
        try:
            return self._run_async(self.generate_audio(article_id, text))
        except Exception as e:
            self.log.error("Sync audio generation failed article_id=%s error=%s", article_id, e)
            return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = AudioEngine()
    path = engine.generate_audio_sync(None, "This is a test of the Pulse Pro audio engine.")
    print(f"Test audio: {path}")
