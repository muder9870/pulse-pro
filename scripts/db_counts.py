"""One-off stats: run inside backend container: python scripts/db_counts.py"""
from sqlalchemy import text
from backend.db.session import engine

QUERIES = [
    ("raw_articles_total", "SELECT COUNT(*) FROM raw_articles"),
    ("raw_non_duplicate", "SELECT COUNT(*) FROM raw_articles WHERE COALESCE(is_duplicate,0)=0"),
    ("processed_articles", "SELECT COUNT(*) FROM processed_articles"),
    ("raw_with_processed_row", "SELECT COUNT(*) FROM raw_articles r INNER JOIN processed_articles p ON p.raw_article_id = r.id"),
    ("raw_state_analyzed", "SELECT COUNT(*) FROM raw_articles WHERE state = 'analyzed'"),
    ("generated_content_rows", "SELECT COUNT(*) FROM generated_content"),
    ("distinct_articles_with_posts", "SELECT COUNT(DISTINCT article_id) FROM generated_content"),
]

def main() -> None:
    with engine.connect() as conn:
        for label, sql in QUERIES:
            n = conn.execute(text(sql)).scalar()
            print(f"{label}\t{n}")

if __name__ == "__main__":
    main()
