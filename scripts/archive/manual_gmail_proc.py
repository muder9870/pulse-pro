import sqlite3
import os

DB_PATH = "d:/Pulse Pro/data/app.db"

def manual_process():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    
    # Get 3 gmail articles
    cur.execute("SELECT id, title FROM raw_articles WHERE source = 'gmail' AND processed = 0 LIMIT 3")
    rows = cur.fetchall()
    
    for rid, title in rows:
        summary = f"Automated summary of: {title}. Captured via new Gmail Smart Fetching layer."
        cur.execute("""
            INSERT INTO processed_articles (
                raw_article_id, summary, key_takeaways, viral_score, tech_score, relevance_score, sentiment, category
            ) VALUES (?, ?, ?, 75, 80, 85, 'Positive', 'General AI')
        """, (rid, summary, "- Discovered via Gmail sync\n- High relevance AI newsletter"))
        
        cur.execute("UPDATE raw_articles SET processed = 1 WHERE id = ?", (rid,))
        print(f"Manually processed article {rid}: {title}")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    manual_process()
