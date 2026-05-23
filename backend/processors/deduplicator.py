from __future__ import annotations

from difflib import SequenceMatcher
from typing import List, Tuple

from backend.db.session import get_session
from ..models import RawArticle
from sqlalchemy import update as sql_update


SOURCE_PRIORITY = {
    "arxiv": 3,
    "gmail": 2,
    "reddit": 1,
    "github": 1,
}


class Deduplicator:
    """Marks duplicate articles in raw_articles.

    Strategy:
    - Compare titles with fuzzy matching
    - Consider URL equality as a strong duplicate signal
    - Keep the highest-priority source (arXiv > Gmail > Reddit/GitHub)
    - Mark other rows with is_duplicate = 1
    """

    def __init__(self, threshold: float = 0.85) -> None:
        self.threshold = threshold
        self.stop_words = {"the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "with", "by", "is", "are", "was", "were", "of"}

    def deduplicate_articles(self) -> int:
        """Scan raw_articles and mark duplicates.

        Returns number of rows marked as duplicates.
        """
        with get_session() as session:
            # 1. Batch claim: Move all 'cleaned' articles to 'deduplicating' in a single transaction
            session.execute(
                sql_update(RawArticle)
                .where(RawArticle.state == 'cleaned')
                .values(state='deduplicating')
            )
            session.commit()

            # 2. Query all 'deduplicating' articles ordered by fetched_at desc
            articles = session.query(RawArticle).filter(
                RawArticle.state == 'deduplicating'
            ).order_by(RawArticle.fetched_at.desc()).all()

            marked = 0
            n = len(articles)
            if n == 0:
                return 0

            # 3. Pre-compute clean word sets and build inverted index
            clean_word_sets = []
            inverted_index = {} # word -> set of article indices
            url_index = {} # url -> list of article indices

            for idx, article in enumerate(articles):
                words = self._clean_to_words(article.title)
                clean_word_sets.append(words)
                
                # Title word inverted index
                for word in words:
                    if word not in inverted_index:
                        inverted_index[word] = set()
                    inverted_index[word].add(idx)
                
                # URL index
                if article.url:
                    if article.url not in url_index:
                        url_index[article.url] = []
                    url_index[article.url].append(idx)

            # 4. Perform candidate-blocked deduplication
            for i in range(n):
                article_i = articles[i]
                if article_i.is_duplicate:
                    continue

                # Find candidates that share at least one cleaned title word or have the same URL
                candidates = set()
                
                # URL matches
                if article_i.url and article_i.url in url_index:
                    for idx in url_index[article_i.url]:
                        if idx > i:
                            candidates.add(idx)
                            
                # Title word matches
                for word in clean_word_sets[i]:
                    if word in inverted_index:
                        for idx in inverted_index[word]:
                            if idx > i:
                                candidates.add(idx)

                for j in sorted(candidates):
                    article_j = articles[j]
                    if article_j.is_duplicate:
                        continue

                    # If URLs are equal and not empty, consider duplicate
                    if article_i.url and article_j.url and article_i.url == article_j.url:
                        self._mark_pair(article_i, article_j)
                        marked += 1
                        continue

                    # Fuzzy title match using pre-cleaned word sets
                    if self.are_duplicates(clean_word_sets[i], clean_word_sets[j]):
                        self._mark_pair(article_i, article_j)
                        marked += 1

            # 5. After scanning, transition remaining 'deduplicating' to 'deduped'
            for article in articles:
                if article.state == 'deduplicating':
                    article.state = 'deduped'
            
            # Single transaction commit for all modifications
            session.commit()

        return marked

    def are_duplicates(self, title1_or_words: str | set[str], title2_or_words: str | set[str]) -> bool:
        """Check if two titles are duplicates using Jaccard similarity on cleaned word sets."""
        if isinstance(title1_or_words, set):
            s1_words = title1_or_words
        else:
            s1_words = self._clean_to_words(title1_or_words)
            
        if isinstance(title2_or_words, set):
            s2_words = title2_or_words
        else:
            s2_words = self._clean_to_words(title2_or_words)
            
        if not s1_words or not s2_words:
            return False

        # Jaccard Similarity
        intersection = s1_words.intersection(s2_words)
        union = s1_words.union(s2_words)
        
        jaccard = len(intersection) / len(union) if union else 0
        
        # Jaccard shortcuts
        if jaccard >= self.threshold:
            return True
        if jaccard < 0.2:
            return False
        
        # Also use SequenceMatcher for character-level similarity
        char_sim = SequenceMatcher(None, " ".join(sorted(list(s1_words))), " ".join(sorted(list(s2_words)))).ratio()
        
        # Combine: weighted average or max
        similarity = max(jaccard, char_sim)
        return similarity >= self.threshold

    def _clean_to_words(self, text: str) -> set[str]:
        """Clean text into a set of significant words."""
        # Remove punctuation and lowercase
        import re
        text = re.sub(r'[^\w\s]', '', (text or "").lower())
        words = text.split()
        # Remove stop words and short words
        return {w for w in words if w not in self.stop_words and len(w) > 2}

    def _source_priority(self, source: str | None) -> int:
        if not source:
            return 0
        return SOURCE_PRIORITY.get(source.lower(), 0)

    def _mark_pair(self, article_a: RawArticle, article_b: RawArticle) -> None:
        """Given two articles, mark the lower-priority one as duplicate."""
        pa = self._source_priority(article_a.source)
        pb = self._source_priority(article_b.source)

        if pa > pb:
            dup_article = article_b
        elif pb > pa:
            dup_article = article_a
        else:
            # Same priority: keep the newer one (already sorted by fetched_at DESC)
            dup_article = article_b

        dup_article.is_duplicate = 1
        dup_article.state = 'archived'



def main() -> None:
    print("[deduplicator] Initializing database and marking duplicates...")
    dedup = Deduplicator()
    marked = dedup.deduplicate_articles()
    print(f"[deduplicator] Marked {marked} rows as duplicates.")


if __name__ == "__main__":
    main()
