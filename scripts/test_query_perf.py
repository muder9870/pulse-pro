import sqlite3
import time
from backend.database import get_connection

def test_query():
    start = time.time()
    with get_connection() as conn:
        cur = conn.cursor()
        article_ids = [1, 2, 3, 4, 5]
        placeholders = ",".join(["?"] * len(article_ids))
        query = f"""
            SELECT 
                p.id,
                r.title, 
                r.source, 
                r.url,
                p.summary,
                g.platform,
                g.content
            FROM generated_content g
            JOIN processed_articles p ON g.article_id = p.id
            JOIN raw_articles r ON p.raw_article_id = r.id
            WHERE p.id IN ({placeholders})
            ORDER BY r.fetched_at DESC, p.id, g.platform
        """
        cur.execute(query, article_ids)
        rows = cur.fetchall()
        end = time.time()
        print(f"Query returned {len(rows)} rows in {end - start:.4f} seconds")
        if rows:
            print(f"First title: {rows[0][1]}")

if __name__ == "__main__":
    test_query()
