import asyncio
import concurrent.futures
import os
import logging
from datetime import datetime
from backend.config import settings
from backend.processors.audio_engine import AudioEngine


PODCAST_PROMPT_TEMPLATE = """
Create a highly engaging, high-signal technical debate script between two expert personas:
1. ALEX (Strategic Visionary): Focused on breakthroughs, long-term upside, and the cutting edge of AI.
2. MORGAN (Pragmatic Skeptic): Focused on implementation hurdles, compute efficiency, and reality checks.

Analyze the following AI news items:
{news_items}

Flow:
- Alex introduces the breakthrough with excitement.
- Morgan interjects with a critical question or "but does it scale?" nuance.
- They debate the specific technical methodology.
- Morgan admits where the value is; Alex acknowledges the hurdles.
- Conclusion: One actionable takeaway for researchers and developers.

Guidelines:
1. Punchy, fast-paced, professional. Use industry-insider tone.
2. Avoid generic hype. Focus on data points from the news.
3. Format: [ALEX] and [MORGAN] labels on each line.
4. Total duration: under 4 minutes when spoken.

Return ONLY the script text.
"""


class PodcastGenerator:
    """Combines selected articles into a conversational daily digest."""

    def __init__(self, voice: str = "en-US-AndrewNeural"):
        self.audio_engine = AudioEngine(voice=voice)
        self.log = logging.getLogger("podcast_generator")

    def _run_async(self, coro):
        """Run a coroutine safely regardless of whether an event loop is running."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Called from within an async context (e.g. Celery with gevent)
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(asyncio.run, coro).result()
            return loop.run_until_complete(coro)
        except RuntimeError:
            return asyncio.run(coro)

    async def generate_daily_digest(
        self,
        article_ids: list[int] | None = None,
        limit: int = 5,
    ) -> str | None:
        """
        Fetch articles, generate a conversational script via LLM router, and create audio.

        Args:
            article_ids: Specific article IDs to include. If None, uses top N by score.
            limit: Number of top articles to use when article_ids is not provided.
        """
        from backend.db.session import SessionLocal
        from backend.db.repositories.article_repository import ArticleRepository
        from backend.db.models import RawArticle

        db = SessionLocal()
        try:
            repo = ArticleRepository(db)
            if article_ids:
                # Fetch specific articles by ID
                raw_articles = (
                    db.query(RawArticle)
                    .filter(RawArticle.id.in_(article_ids))
                    .all()
                )
                stories = [repo._format_story(a) for a in raw_articles if a]
            else:
                stories = repo.get_top_stories(limit=limit)
        finally:
            db.close()

        if not stories:
            self.log.warning("No stories found for podcast digest")
            return None

        # Format news items for prompt
        news_items = ""
        for story in stories:
            news_items += f"- Title: {story['title']}\n  Summary: {story.get('summary', '')}\n\n"

        # Generate script via SmartLLMRouter (full fallback chain)
        from backend.llm.llm_router import smart_router, Task
        try:
            prompt = PODCAST_PROMPT_TEMPLATE.format(news_items=news_items)
            response = smart_router.generate(prompt, max_tokens=2048, task=Task.SOCIAL_LONG)
            script = str(response)
        except Exception as e:
            self.log.error("LLM script generation failed: %s", e)
            script = "Welcome to your AI Pulse Pro digest. Today's top stories: "
            script += ". ".join(s["title"] for s in stories)

        # Clean speaker labels for single-voice TTS
        clean_script = script.replace("[ALEX]", "Alex: ").replace("[MORGAN]", "Morgan: ")

        # Generate audio
        filename = f"podcast_digest_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        path = await self.audio_engine.generate_audio(None, clean_script, filename=filename)

        if path:
            self.log.info("Podcast digest generated: %s", path)
            return path
        return None

    def generate_daily_digest_sync(
        self,
        article_ids: list[int] | None = None,
        limit: int = 5,
    ) -> str | None:
        try:
            return self._run_async(
                self.generate_daily_digest(article_ids=article_ids, limit=limit)
            )
        except Exception as e:
            self.log.error("Digest generation failed: %s", e)
            return None

    def generate_article_podcast_sync(self, article_id: int) -> str | None:
        """Generate a podcast for a single article."""
        try:
            return self._run_async(self.generate_article_podcast(article_id))
        except Exception as e:
            self.log.error("Article podcast generation failed: %s", e)
            return None

    async def generate_article_podcast(self, article_id: int) -> str | None:
        """Generate a podcast for a single article with article_id linkage."""
        from backend.db.session import SessionLocal
        from backend.db.repositories.article_repository import ArticleRepository
        from backend.db.models import RawArticle

        db = SessionLocal()
        try:
            repo = ArticleRepository(db)
            # Get the article
            raw_article = db.query(RawArticle).filter(RawArticle.id == article_id).first()
            if not raw_article:
                self.log.warning(f"Article {article_id} not found")
                return None
            
            story = repo._format_story(raw_article)
            
            # Get processed article ID for linking
            processed_id = repo.ensure_processed_id(article_id)
            if not processed_id:
                self.log.warning(f"Article {article_id} not processed yet")
                return None
        finally:
            db.close()

        # Generate script for single article
        from backend.llm.llm_router import smart_router, Task
        try:
            prompt = f"""Create an engaging podcast script for this article:

Title: {story['title']}
Summary: {story.get('summary', '')}

Generate a conversational podcast script (2-3 minutes) that:
1. Introduces the topic in an engaging way
2. Explains the key points clearly
3. Provides context and analysis
4. Ends with a thought-provoking conclusion

Keep it natural and conversational."""
            
            response = smart_router.generate(prompt, max_tokens=1024, task=Task.SOCIAL_LONG)
            script = str(response)
        except Exception as e:
            self.log.error("LLM script generation failed: %s", e)
            script = f"Today's story: {story['title']}. {story.get('summary', '')}"

        # Generate audio with article_id linkage
        filename = f"podcast_article_{article_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp3"
        path = await self.audio_engine.generate_audio(processed_id, script, filename=filename)

        if path:
            self.log.info(f"Article podcast generated for article {article_id}: {path}")
            return path
        return None


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    gen = PodcastGenerator()
    path = gen.generate_daily_digest_sync()
    print(f"Daily Podcast generated at: {path}")
