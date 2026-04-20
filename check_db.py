from backend.db.session import SessionLocal
from backend.db.models import ArticleAudio
from sqlalchemy import desc

db = SessionLocal()
try:
    latest = db.query(ArticleAudio).order_by(desc(ArticleAudio.created_at)).first()
    if latest:
        print(f"Latest ArticleAudio: ID={latest.id}, article_id={latest.article_id}, url={latest.audio_url}")
    else:
        print("No ArticleAudio entries found.")
finally:
    db.close()
