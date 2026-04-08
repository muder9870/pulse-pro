import logging
import json
import ollama
from backend.config import settings
from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.models import ProcessedArticle, RawArticle, VideoScript
from sqlalchemy.orm import joinedload

log = logging.getLogger("video_generator")

class VideoGenerator:
    """Generates short-form video scripts for TikTok, Reels, and Shorts."""

    def __init__(self, model: str = None):
        self.model = model or settings.OLLAMA_MODEL

    def generate_video_script(self, article_id: int, platform: str = "tiktok") -> dict | None:
        """Generate a video script based on a processed article."""
        # Resolve to ProcessedArticle.id
        db = SessionLocal()
        try:
            a_repo = ArticleRepository(db)
            p_id = a_repo.ensure_processed_id(article_id)
        finally:
            db.close()
            
        if not p_id:
            log.error("article_not_found_or_not_processed id=%d", article_id)
            return None

        log.info("generate_video_script article_id=%d platform=%s", p_id, platform)
        
        article = self._get_article_data(p_id)
        if not article:
            log.error("article_data_fetch_failed id=%d", p_id)
            return None

        # Improved prompt with explicit JSON formatting instructions
        prompt = f"""You are a video script writer. Create a 60-second {platform} video script about this AI news.

Title: {article['title']}
Summary: {article['summary']}
Key Points: {article['key_takeaways']}

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format, with no additional text before or after:
{{
  "script": "Your engaging 60-second script here with a hook, explanation, and call to action",
  "visual_cues": ["Visual cue 1", "Visual cue 2", "Visual cue 3"],
  "duration_est": 60
}}

Respond with ONLY the JSON object, nothing else."""

        try:
            response = ollama.generate(model=self.model, prompt=prompt)
            res_text = response['response'].strip()
            
            # Try to parse as direct JSON first
            try:
                script_data = json.loads(res_text)
                self._save_to_db(p_id, platform, script_data)
                log.info("video_script_generated successfully article_id=%d", p_id)
                return script_data
            except json.JSONDecodeError:
                # Fallback: Extract JSON from markdown code blocks or surrounding text
                import re
                
                # Try to find JSON in code blocks
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', res_text, re.DOTALL)
                if json_match:
                    script_data = json.loads(json_match.group(1))
                    self._save_to_db(p_id, platform, script_data)
                    log.info("video_script_generated from code block article_id=%d", p_id)
                    return script_data
                
                # Try to find any JSON object
                start = res_text.find("{")
                end = res_text.rfind("}") + 1
                if start != -1 and end > start:
                    json_str = res_text[start:end]
                    script_data = json.loads(json_str)
                    self._save_to_db(p_id, platform, script_data)
                    log.info("video_script_generated from extracted json article_id=%d", p_id)
                    return script_data
                
                # Last resort: Create structured output from plain text
                log.warning("failed_to_parse_json creating_fallback_structure article_id=%d", article_id)
                script_data = {
                    "script": res_text[:500],  # Use first 500 chars as script
                    "visual_cues": ["Show article title", "Display key points", "Call to action"],
                    "duration_est": 60
                }
                self._save_to_db(p_id, platform, script_data)
                return script_data
                
        except Exception as e:
            log.error("video_script_generation_failed error=%s", e)
            return None

    def _get_article_data(self, article_id: int) -> dict | None:
        db = SessionLocal()
        try:
            article = db.query(ProcessedArticle).options(
                joinedload(ProcessedArticle.raw_article)
            ).filter(ProcessedArticle.id == article_id).first()
            
            if article:
                return {
                    "title": article.raw_article.title,
                    "summary": article.summary,
                    "key_takeaways": article.key_takeaways
                }
            return None
        finally:
            db.close()

    def _save_to_db(self, article_id: int, platform: str, data: dict) -> None:
        db = SessionLocal()
        try:
            script = VideoScript(
                article_id=article_id,
                platform=platform,
                script_text=data.get('script'),
                visual_cues=json.dumps(data.get('visual_cues')),
                duration_est=data.get('duration_est')
            )
            db.add(script)
            db.commit()
        finally:
            db.close()

video_generator = VideoGenerator()
