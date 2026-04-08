from __future__ import annotations

import json
import re
from dataclasses import dataclass


STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "has",
    "have",
    "how",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "of",
    "on",
    "or",
    "our",
    "that",
    "the",
    "their",
    "this",
    "to",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
    "you",
    "your",
}


@dataclass(frozen=True)
class SeoResult:
    markdown: str
    meta_description: str
    focus_keyword: str | None
    readability_score: float | None
    platform_slugs_json: str
    alt_text_suggestions_json: str


_IMG_RE = re.compile(r"!\[(?P<alt>[^\]]*)\]\((?P<url>[^)]+)\)")
_H_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$", re.MULTILINE)


def slugify(text: str) -> str:
    s = (text or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s[:80] or "post"


def _first_paragraph(md: str) -> str:
    s = (md or "").strip()
    s = re.sub(r"```[\s\S]*?```", "", s)
    s = re.sub(r"^#\s+.*$", "", s, flags=re.MULTILINE).strip()
    s = re.sub(r"^##\s+Sources[\s\S]*$", "", s, flags=re.MULTILINE).strip()
    s = re.sub(r"\n{2,}", "\n\n", s)
    para = s.split("\n\n", 1)[0].strip()
    para = re.sub(r"\s+", " ", para).strip()
    return para


def meta_description_from_markdown(md: str, max_chars: int = 160) -> str:
    para = _first_paragraph(md)
    if not para:
        return ""
    if len(para) <= max_chars:
        return para
    truncated = para[: max(0, max_chars - 1)].rstrip()
    return truncated.rstrip(".,;:!?-") + "…"


def _normalize_headings(md: str, title: str) -> str:
    s = (md or "").strip()
    if not s.startswith("#"):
        s = f"# {title}\n\n{s}"

    lines = s.splitlines()
    out: list[str] = []
    seen_h1 = False
    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if not m:
            out.append(line)
            continue
        level = len(m.group(1))
        text = m.group(2).strip()
        if level == 1:
            if not seen_h1:
                out.append(f"# {text}")
                seen_h1 = True
            else:
                out.append(f"## {text}")
        else:
            out.append(line)

    return "\n".join(out).strip() + "\n"


def _estimate_syllables(word: str) -> int:
    w = re.sub(r"[^a-z]", "", (word or "").lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for ch in w:
        is_vowel = ch in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if w.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def flesch_reading_ease(text: str) -> float | None:
    t = re.sub(r"```[\s\S]*?```", "", text or "")
    t = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", t)
    t = re.sub(r"!\[(.*?)\]\((.*?)\)", r"\1", t)
    sentences = max(1, len(re.findall(r"[.!?]+", t)))
    words = re.findall(r"[A-Za-z][A-Za-z']*", t)
    if not words:
        return None
    word_count = len(words)
    syllables = sum(_estimate_syllables(w) for w in words)
    score = 206.835 - 1.015 * (word_count / float(sentences)) - 84.6 * (syllables / float(word_count))
    return float(round(score, 2))


def infer_focus_keyword(title: str, md: str) -> str | None:
    text = f"{title or ''} {md or ''}".lower()
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"\[(.*?)\]\((.*?)\)", r"\1", text)
    words = re.findall(r"[a-z][a-z0-9]{2,}", text)
    freq: dict[str, int] = {}
    for w in words:
        if w in STOPWORDS:
            continue
        freq[w] = freq.get(w, 0) + 1
    if not freq:
        return None
    top = sorted(freq.items(), key=lambda kv: (kv[1], len(kv[0])), reverse=True)[0][0]
    return top


def alt_text_suggestions(md: str) -> list[dict]:
    suggestions: list[dict] = []
    for m in _IMG_RE.finditer(md or ""):
        alt = (m.group("alt") or "").strip()
        url = (m.group("url") or "").strip()
        if not url:
            continue
        if alt and alt.lower() not in {"image", "screenshot", "diagram"}:
            continue
        name = url.split("/")[-1].split("?")[0]
        name = re.sub(r"\.[a-z0-9]{2,5}$", "", name, flags=re.IGNORECASE)
        name = re.sub(r"[-_]+", " ", name).strip()
        suggested = name if name else "Illustration related to the article"
        suggestions.append({"url": url, "suggested_alt": suggested})
    return suggestions


def platform_slugs(base_slug: str) -> dict:
    slug = slugify(base_slug)
    return {
        "default": slug,
        "wordpress": slug,
        "devto": slug,
        "medium": slug,
    }


def optimize_markdown(title: str, md: str, base_slug: str) -> SeoResult:
    normalized = _normalize_headings(md, title=title)
    meta = meta_description_from_markdown(normalized, max_chars=160)
    focus = infer_focus_keyword(title, normalized)
    readability = flesch_reading_ease(normalized)
    slugs = platform_slugs(base_slug)
    alt = alt_text_suggestions(normalized)
    return SeoResult(
        markdown=normalized,
        meta_description=meta,
        focus_keyword=focus,
        readability_score=readability,
        platform_slugs_json=json.dumps(slugs),
        alt_text_suggestions_json=json.dumps(alt),
    )
