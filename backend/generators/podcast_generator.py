import asyncio
import os
import logging
from datetime import datetime
from backend.config import settings
from backend.processors.audio_engine import AudioEngine
from groq import Groq

class PodcastGenerator:
    """Combines top articles into a conversational daily digest."""
    
    PODCAST_PROMPT_TEMPLATE = """
    Create a highly engaging, conversational podcast dialogue script between a Host (Jamie) and an AI Expert (Dr. Aris) based on these news items.
    
    News Items:
    {news_items}
    
    Guidelines:
    1. The Host is curious and asks insightful questions.
    2. The Expert explains the technical significance and real-world implications.
    3. Keep it punchy, dynamic, and under 5 minutes when spoken.
    4. Start with an exciting intro and end with a summary.
    5. Format the output as a script with [JAMIE] and [ARIS] labels.
    
    Strictly return ONLY the script text.
    """

    def __init__(self, voice: str = "en-US-AndrewNeural"):
        self.audio_engine = AudioEngine(voice=voice)
        self.client = Groq(api_key=settings.GROQ_API_KEY)
        self.log = logging.getLogger("podcast_generator")

    async def generate_daily_digest(self, limit: int = 5) -> str | None:
        """Fetch top articles, generate a conversational script via LLM, and create audio."""
        from backend.db.session import SessionLocal
        from backend.db.repositories.article_repository import ArticleRepository
        
        db = SessionLocal()
        try:
            a_repo = ArticleRepository(db)
            stories = a_repo.get_top_stories(limit=limit)
        finally:
            db.close()
            
        if not stories:
            self.log.warning("No stories found for daily digest")
            return None
            
        # Format news items for prompt
        news_items = ""
        for i, story in enumerate(stories):
            news_items += f"- Title: {story['title']}\n  Summary: {story.get('summary', '')}\n\n"
            
        # Generate script via LLM
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a professional podcast script writer."},
                    {"role": "user", "content": self.PODCAST_PROMPT_TEMPLATE.format(news_items=news_items)}
                ],
                temperature=0.7,
            )
            script = response.choices[0].message.content
        except Exception as e:
            self.log.error("LLM script generation failed: %s", e)
            # Fallback to basic script
            script = f"Welcome to your AI Pulse Pro digest. Today's top stories are: "
            script += ". ".join([s['title'] for s in stories])
        
        # Clean script from labels for TTS (or keep them if the voice handles it)
        # For single voice, removing labels makes it smoother
        clean_script = script.replace("[JAMIE]", "Jamie here: ").replace("[ARIS]", "Dr. Aris says: ")
        
        # Generate audio
        filename = f"podcast_digest_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        path = await self.audio_engine.generate_audio(0, clean_script, filename=filename)
        
        if path:
            self.log.info("Podcast digest generated: %s", path)
            return path
        return None

    def generate_daily_digest_sync(self, limit: int = 5) -> str | None:
        try:
            return asyncio.run(self.generate_daily_digest(limit))
        except Exception as e:
            self.log.error("Digest generation failed: %s", e)
            return None

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    gen = PodcastGenerator()
    path = gen.generate_daily_digest_sync()
    print(f"Daily Podcast generated at: {path}")
