from __future__ import annotations

import logging
from typing import Dict, List

from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.llm.llm_router import LLMResponse, smart_router, Task


def _llm_output_text_and_provider(llm_res: LLMResponse | str) -> tuple[str, str]:
    """Router historically returned raw str for SOCIAL_SHORT; always normalize."""
    if isinstance(llm_res, str):
        return llm_res, "unknown"
    return llm_res.content or "", llm_res.provider
from backend.generators.platform_templates import PLATFORM_CONFIGS, get_platforms, get_few_shot_examples
from backend.models import ProcessedArticle, RawArticle, GeneratedContent
from backend.processors.personalization_engine import personalization_engine
from sqlalchemy.orm import joinedload

# Platform to task mapping
PLATFORM_TASKS = {
    "twitter": Task.SOCIAL_SHORT,
    "threads": Task.SOCIAL_SHORT,
    "linkedin": Task.SOCIAL_LONG,
    "blog": Task.SOCIAL_LONG,
    "youtube": Task.VIDEO_SCRIPT,
    "instagram": Task.SOCIAL_SHORT,
    "facebook": Task.SOCIAL_LONG,
    "reddit": Task.SOCIAL_LONG
}


CONTENT_PROMPT_TEMPLATE = """You are an AI social media copywriter.

Write a post for the {platform_label} platform about the following AI/ML article.

GLOBAL RULE: You MUST start the post with a VIRAL HOOK. 
Then, expand into the platform-specific format and content.

ARTICLE TITLE:
{title}

VIRAL HOOK (LEAD WITH THIS):
{viral_hook}

SUMMARY:
{summary}

KEY TAKEAWAYS:
{key_takeaways}

REQUIREMENTS:
- Tone: {tone}
- Format: {format}
- Maximum characters: {char_limit}
- Make it clear, engaging, and suitable for {platform_label}.
- This output MUST be explicitly tailored to {platform_label} audience expectations.
- Do NOT include hashtags (they will be added separately).

Return ONLY the post text, with no explanations.

{personalization_context}

FEW-SHOT EXAMPLES (BEST-IN-CLASS):
{few_shot_examples}
"""


class ContentGenerator:
    def __init__(self) -> None:
        self.router = smart_router
        self.log = logging.getLogger("content_generator")

    def generate_for_article(self, article_id: int, platforms: List[str] | None = None) -> Dict[str, str]:
        """Generate content for a single article across selected platforms.

        Returns a mapping of platform -> generated text.
        """
        if platforms is None:
            platforms = get_platforms()

        # Resolve to ProcessedArticle.id using ArticleRepository
        db = SessionLocal()
        try:
            a_repo = ArticleRepository(db)
            p_id = a_repo.ensure_processed_id(article_id)
            if not p_id:
                # Trigger on-demand processing
                from backend.processors.analyzer import ArticleAnalyzer
                analyzer = ArticleAnalyzer()
                self.log.info(f"triggering_on_demand_analysis article_id={article_id}")
                p_id = analyzer.process_single_article(article_id)
                
                if not p_id:
                    raise ValueError(f"Article with id {article_id} not found or could not be processed.")

            # 1. Fetch data and close connection immediately
            article = db.query(ProcessedArticle).options(
                joinedload(ProcessedArticle.raw_article)
            ).filter(ProcessedArticle.id == p_id).first()
            
            if not article:
                raise ValueError(f"Article with id {article_id} not found.")
            
            # Extract primitive data to avoid detached instance issues
            article_info = {
                "title": article.raw_article.title,
                "url": article.raw_article.url,
                "source": article.raw_article.source,
                "summary": article.summary,
                "viral_hook": article.viral_hook,
                "key_takeaways": article.key_takeaways
            }
        finally:
            db.close()

        title = article_info["title"]
        url = article_info["url"]
        source = article_info["source"]
        summary = article_info["summary"]
        viral_hook = article_info["viral_hook"]
        key_takeaways = article_info["key_takeaways"]

        results: Dict[str, str] = {}
        errors: list[str] = []

        for platform in platforms:
            platform_key = str(platform).strip().lower()
            if platform_key not in PLATFORM_CONFIGS:
                continue
            cfg = PLATFORM_CONFIGS[platform_key]

            token_limit = {
                "twitter": 220,
                "bluesky": 220,
                "threads": 300,
                "mastodon": 300,
                "linkedin": 700,
                "reddit": 900,
                "hackernews": 500,
                "facebook": 600,
                "instagram": 300,
                "tiktok": 300,
                "youtube": 900,
                "medium": 1200,
                "newsletter": 900,
                "telegram": 500,
                "discord": 350,
            }.get(platform_key, 512)

            pers_context = personalization_engine.get_personalization_context(platform_key)

            few_shot = get_few_shot_examples(platform_key)

            prompt = CONTENT_PROMPT_TEMPLATE.format(
                platform_label=str(platform).capitalize(),
                title=title,
                summary=summary,
                viral_hook=viral_hook,
                key_takeaways=key_takeaways,
                tone=cfg["tone"],
                format=cfg.get("format", "standard"),
                char_limit=cfg.get("max_chars", 280),
                personalization_context=pers_context,
                few_shot_examples=few_shot
            )

            try:
                # Check LLM cache first
                from backend.llm_cache import get_cached_response, cache_llm_response
                
                task = PLATFORM_TASKS.get(platform_key, Task.SOCIAL_SHORT)
                model_name = f"task_{task.value}"
                
                cached_text = get_cached_response(prompt, model=model_name)
                if cached_text:
                    text = cached_text
                    self.log.info(f"llm_cache_hit platform={platform_key} article_id={article_id}")
                else:
                    # Generate new response with task-aware routing
                    llm_res = self.router.generate(prompt, max_tokens=token_limit, task=task)
                    text, provider = _llm_output_text_and_provider(llm_res)
                    
                    # Cache the response
                    cache_llm_response(prompt, text, model=model_name)
                    self.log.info(f"llm_generated_and_cached platform={platform_key} article_id={article_id} provider={provider}")
                    
            except Exception as exc:
                msg = f"{platform_key}: {exc}"
                errors.append(msg)
                parts: list[str] = []
                parts.append(f"[{platform_key.upper()}]")
                if title:
                    parts.append(str(title).strip())
                if summary:
                    parts.append(str(summary).strip())
                if key_takeaways:
                    parts.append(str(key_takeaways).strip())
                if url:
                    parts.append(str(url).strip())
                if source:
                    parts.append(f"Source: {str(source).strip()}")
                text = "\n\n".join([p for p in parts if p]).strip()
                self.log.warning("llm_failed_using_fallback platform=%s article_id=%s error=%s", platform_key, article_id, exc)

            # Enforce character limit
            if len(text) > cfg["char_limit"]:
                text = text[: cfg["char_limit"] - 3] + "..."

            # Phase 9: Apply Monetization (Affiliate Link Insertion)
            try:
                from backend.processors.monetization_engine import monetization_engine
                text = monetization_engine.apply_monetization(text)
            except Exception as e:
                self.log.error("monetization_failed platform=%s error=%s", platform_key, e)

            results[platform_key] = text

            # Save into generated_content table
            db2 = SessionLocal()
            try:
                new_content = GeneratedContent(
                    article_id=p_id,
                    platform=platform_key,
                    content=text,
                    char_count=len(text)
                )
                db2.add(new_content)
                
                # Mark article as generated
                processed = db2.get(ProcessedArticle, p_id)
                if processed:
                    processed.generated = 1
                db2.commit()
            finally:
                db2.close()

        if not results:
            raise RuntimeError("No content generated.")

        return results

    def generate_for_top_articles(self, limit: int = 5, platforms: List[str] | None = None) -> Dict[int, Dict[str, str]]:
        """Generate content for top N scored articles."""
        return self.generate_for_priority(priority_filter=None, limit=limit, platforms=platforms)

    def generate_for_priority(self, priority_filter: str | None = 'HIGH', limit: int = 1, platforms: List[str] | None = None) -> Dict[int, Dict[str, str]]:
        """Generate content for articles matching a specific priority (e.g., HIGH).

        Returns mapping article_id -> { platform: text }.
        """
        if platforms is None:
            platforms = get_platforms()

        results: Dict[int, Dict[str, str]] = {}
        
        db3 = SessionLocal()
        try:
            query = db3.query(ProcessedArticle.id).join(
                RawArticle
            ).filter(
                ProcessedArticle.generated == 0,
                RawArticle.is_duplicate == 0
            )
            
            if priority_filter:
                query = query.filter(ProcessedArticle.priority == priority_filter)
            
            query = query.order_by(ProcessedArticle.priority_score.desc()).limit(limit)
            
            article_ids = [row.id for row in query.all()]
        finally:
            db3.close()

        for pid in article_ids:
            try:
                results[pid] = self.generate_for_article(pid, platforms=platforms)
            except Exception as e:
                self.log.warning("generate_for_article_skipped article_id=%s error=%s", pid, e)
                continue

        return results


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    gen = ContentGenerator()
    results = gen.generate_for_top_articles(limit=5)
    for article_id, platform_map in results.items():
        logging.getLogger("content_generator").info("article_id=%s", article_id)
        for platform, text in platform_map.items():
            logging.getLogger("content_generator").info("platform=%s chars=%s", platform, len(text))


if __name__ == "__main__":
    main()
