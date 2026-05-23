from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.models import ArticleImage, PaperAnalysis, VideoScript, RawArticle, ProcessedArticle
from pathlib import Path

class MediaRepository:
    def __init__(self, session: Session):
        self.session = session

    def save_image(self, article_id: int, image_url: str | None, local_path: str | None, media_type: str, prompt: str | None = None) -> int:
        image = ArticleImage(article_id=article_id, image_url=image_url, local_path=local_path, media_type=media_type, prompt=prompt)
        self.session.add(image)
        self.session.commit()
        return image.id

    def get_article_images(self, article_id: int) -> list[dict]:
        images = self.session.query(ArticleImage).filter(ArticleImage.article_id == article_id).all()
        return [{
            "id": img.id,
            "article_id": img.article_id,
            "image_url": f"/api/media/images/{Path(str(img.local_path)).name}" if img.local_path else img.image_url,
            "local_path": img.local_path,
            "media_type": img.media_type,
            "prompt": img.prompt,
            "created_at": img.created_at.isoformat() if img.created_at else None,
        } for img in images]

    def save_paper_analysis(self, article_id: int, analysis_json: str):
        analysis = PaperAnalysis(article_id=article_id, analysis_json=analysis_json)
        self.session.add(analysis)
        self.session.commit()

    def get_video_scripts(self, article_id: int) -> list[dict]:
        rows = self.session.query(VideoScript).filter(VideoScript.article_id == article_id).order_by(VideoScript.created_at.desc()).all()
        return [{
            "id": r.id,
            "article_id": r.article_id,
            "platform": r.platform,
            "script_text": r.script_text,
            "visual_cues": r.visual_cues,
            "duration_est": r.duration_est,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        } for r in rows]

    def get_all_assets(self) -> list[dict]:
        images = self.session.query(ArticleImage, RawArticle.title.label("article_title")).join(ProcessedArticle, ArticleImage.article_id == ProcessedArticle.id).join(RawArticle, ProcessedArticle.raw_article_id == RawArticle.id).order_by(ArticleImage.created_at.desc()).all()
        scripts = self.session.query(VideoScript, RawArticle.title.label("article_title")).join(ProcessedArticle, VideoScript.article_id == ProcessedArticle.id).join(RawArticle, ProcessedArticle.raw_article_id == RawArticle.id).order_by(VideoScript.created_at.desc()).all()
        
        assets = []
        for img, article_title in images:
            assets.append({
                "asset_type": "image",
                "id": img.id,
                "article_id": img.article_id,
                "article_title": article_title,
                "image_url": f"/api/media/images/{Path(str(img.local_path)).name}" if img.local_path else img.image_url,
                "media_type": img.media_type,
                "prompt": img.prompt,
                "created_at": img.created_at.isoformat() if img.created_at else None,
            })
        for scr, article_title in scripts:
            assets.append({
                "asset_type": "video_script",
                "id": scr.id,
                "article_id": scr.article_id,
                "article_title": article_title,
                "platform": scr.platform,
                "script_text": scr.script_text,
                "created_at": scr.created_at.isoformat() if scr.created_at else None,
            })
        return assets
