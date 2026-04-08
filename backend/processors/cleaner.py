from __future__ import annotations

import re
from bs4 import BeautifulSoup

from backend.db.session import SessionLocal
from backend.models import RawArticle
from sqlalchemy import update as sql_update


HTML_BREAK_RE = re.compile(r"<br\s*/?>", re.IGNORECASE)


class Cleaner:
    """Cleans raw article content.

    Responsibilities:
    - Strip HTML tags from raw_content when needed
    - Remove obvious promo/unsubscribe blocks
    - Normalize whitespace
    """

    PROMO_PATTERNS = [
        "unsubscribe",
        "manage your preferences",
        "view in browser",
        "privacy policy",
    ]

    def clean_all_articles(self, limit: int | None = None) -> int:
        """Clean raw_content for all non-processed articles.

        Returns number of rows updated.
        """
        updated = 0
        session = SessionLocal()
        try:
            query = session.query(RawArticle).filter(
                RawArticle.state == 'pending',
                RawArticle.raw_content.isnot(None)
            )
            
            if limit is not None:
                query = query.limit(limit)
            
            articles = query.all()

            for article in articles:
                # Atomic claim
                result = session.execute(
                    sql_update(RawArticle)
                    .where(RawArticle.id == article.id, RawArticle.state == 'pending')
                    .values(state='cleaning')
                )
                session.commit()
                
                if result.rowcount == 0:
                    continue

                if not article.raw_content:
                    article.state = 'cleaned'
                    session.commit()
                    continue

                cleaned = self._clean_text(article.raw_content)
                article.raw_content = cleaned
                article.state = 'cleaned'
                updated += 1

            session.commit()
        finally:
            session.close()

        return updated

    def _clean_text(self, text: str) -> str:
        # If it looks like HTML, use BeautifulSoup
        if "<" in text and ">" in text:
            soup = BeautifulSoup(text, "html.parser")

            # Remove script/style
            for tag in soup(["script", "style"]):
                tag.decompose()

            cleaned = soup.get_text(separator=" ")
        else:
            cleaned = text

        # Normalize line breaks and whitespace
        cleaned = HTML_BREAK_RE.sub(" ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Remove common promo/unsubscribe lines
        lower = cleaned.lower()
        for pat in self.PROMO_PATTERNS:
            idx = lower.find(pat)
            if idx != -1:
                cleaned = cleaned[:idx].strip()
                break

        return cleaned


def main() -> None:
    print("[cleaner] Initializing database and cleaning articles...")
    cleaner = Cleaner()
    updated = cleaner.clean_all_articles()
    print(f"[cleaner] Updated {updated} rows in raw_articles.")


if __name__ == "__main__":
    main()
