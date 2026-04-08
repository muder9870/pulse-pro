from __future__ import annotations

import math
import re
from dataclasses import dataclass

from backend.db.session import SessionLocal
from backend.db.repositories.article_repository import ArticleRepository
from backend.models import ProcessedArticle, RawArticle
from backend.llm.llm_router import smart_router, Task
from backend.generators.seo_optimizer import optimize_markdown


def slugify(text: str) -> str:
    s = (text or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s[:80] or "post"


def word_count(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text or ""))


def reading_time_minutes(words: int, wpm: int = 200) -> int:
    return max(1, int(math.ceil(max(0, words) / float(wpm))))


def excerpt_from_markdown(md: str, max_chars: int = 200) -> str:
    s = (md or "").strip()
    s = re.sub(r"^#.*$", "", s, flags=re.MULTILINE).strip()
    s = re.sub(r"\n{2,}", "\n\n", s)
    first_para = s.split("\n\n", 1)[0].strip()
    first_para = re.sub(r"\s+", " ", first_para).strip()
    return first_para[:max_chars].rstrip() if first_para else ""


def _insert_table_of_contents(md: str) -> str:
    s = (md or "").strip()
    if "## Table of Contents" in s:
        return s + "\n"

    headings = []
    for line in s.splitlines():
        m = re.match(r"^##\s+(.+?)\s*$", line)
        if not m:
            continue
        h = m.group(1).strip()
        if not h or h.lower() in {"table of contents", "sources"}:
            continue
        headings.append(h)

    if len(headings) < 4:
        return s + "\n"

    toc_lines = ["## Table of Contents", ""]
    for h in headings:
        toc_lines.append(f"- [{h}](#{slugify(h)})")

    lines = s.splitlines()
    if not lines:
        return s + "\n"
    if not lines[0].startswith("# "):
        return s + "\n"

    out = [lines[0], ""]
    out.extend(toc_lines)
    out.append("")
    out.extend(lines[1:])
    return "\n".join(out).strip() + "\n"


@dataclass
class BlogPostDraft:
    article_id: int
    title: str
    slug: str
    content: str
    excerpt: str
    focus_keyword: str | None
    word_count: int
    reading_time: int
    meta_description: str
    readability_score: float | None
    platform_slugs_json: str
    alt_text_suggestions_json: str


class BlogPostGenerator:
    def __init__(self) -> None:
        self.router = smart_router

    def generate_for_article(self, article_id: int, target_words: int = 1600) -> BlogPostDraft:
        # Resolve to ProcessedArticle.id
        db = SessionLocal()
        try:
            a_repo = ArticleRepository(db)
            p_id = a_repo.ensure_processed_id(article_id)
            if not p_id:
                raise ValueError(f"Article {article_id} not processed.")

            article = db.query(
                RawArticle.title,
                RawArticle.url,
                RawArticle.source,
                RawArticle.category,
                ProcessedArticle.summary,
                ProcessedArticle.key_takeaways
            ).join(
                ProcessedArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                ProcessedArticle.id == p_id
            ).first()
            
            if not article:
                raise ValueError("Article not found.")
            
            title, url, source, category, summary, key_takeaways = article
        finally:
            db.close()

        title = str(title or "")
        summary = str(summary or "")
        key_takeaways = str(key_takeaways or "")
        url = str(url or "")
        source = str(source or "")
        category = str(category or "")

        prompt = f"""You are an expert AI/ML blogger.

Write a long-form blog post in Markdown about this article.

ARTICLE TITLE: {title}
ARTICLE URL: {url}
SOURCE: {source}
CATEGORY: {category}

SUMMARY:
{summary}

KEY TAKEAWAYS:
{key_takeaways}

REQUIREMENTS:
- Write ~{target_words} words.
- Use Markdown headings with one H1 title and multiple H2 sections.
- Include: Introduction, What it is, Why it matters, Key details, Practical implications, Limitations, Conclusion.
- Make it readable for builders (engineers + founders), not academic.
- Avoid making up citations; only reference the provided URL in a Sources section at the end.
- Output ONLY the Markdown.
"""

        md = self.router.generate(prompt, max_tokens=1200, task=Task.SOCIAL_LONG)
        if not md.content.strip().startswith("#"):
            md = f"# {title}\n\n{md.content.strip()}\n"
        if "## Sources" not in md.content:
            md = md.content.rstrip() + f"\n\n## Sources\n- {url}\n"

        slug = slugify(title)
        md = _insert_table_of_contents(md)
        seo = optimize_markdown(title=title, md=md, base_slug=slug)

        wc = word_count(seo.markdown)
        rt = reading_time_minutes(wc)
        excerpt = excerpt_from_markdown(seo.markdown)
        focus_keyword = category.strip() if category.strip() else seo.focus_keyword

        return BlogPostDraft(
            article_id=int(article_id),
            title=title,
            slug=slug,
            content=seo.markdown,
            excerpt=excerpt,
            focus_keyword=focus_keyword,
            word_count=wc,
            reading_time=rt,
            meta_description=seo.meta_description,
            readability_score=seo.readability_score,
            platform_slugs_json=seo.platform_slugs_json,
            alt_text_suggestions_json=seo.alt_text_suggestions_json,
        )
