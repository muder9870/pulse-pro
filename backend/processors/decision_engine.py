from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

from backend.db.session import get_session
from ..models import ProcessedArticle, RawArticle, DailyIntelligence
from ..llm import get_llm_client
from sqlalchemy import update as sql_update
from sqlalchemy.dialects.postgresql import insert as pg_insert

log = logging.getLogger("decision_engine")
debug = str(os.getenv("DEBUG_PIPELINE", "")).lower() in {"1", "true", "yes"}

class DecisionEngine:
    def __init__(self) -> None:
        self.llm = get_llm_client()

    def calculate_weighted_score(self, row: Dict[str, Any]) -> float:
        """Calculate weighted score: 40% Viral, 30% Tech, 30% Relevance."""
        viral = row.get("viral_score", 0) or 0
        tech = row.get("tech_score", 0) or 0
        relevance = row.get("relevance_score", 0) or 0
        source = (row.get("source") or "").lower()
        fetched_at = row.get("fetched_at")

        weighted_score = (viral * 0.4) + (tech * 0.3) + (relevance * 0.3)

        # Novelty Boost (20% boost for fresh GitHub or arXiv)
        is_fresh = False
        if fetched_at:
            now = datetime.now(timezone.utc)
            try:
                if isinstance(fetched_at, str):
                    ts = datetime.fromisoformat(fetched_at).replace(tzinfo=timezone.utc)
                else:
                    ts = fetched_at.astimezone(timezone.utc)
                hours_old = (now - ts).total_seconds() / 3600.0
                is_fresh = hours_old < 24
            except Exception:
                pass

        novelty_boost = 1.2 if (source in ["arxiv", "github"] and is_fresh) else 1.0
        return weighted_score * novelty_boost

    def classify_priority(self, article_id: int) -> Tuple[str, float, str]:
        """Classify article into HIGH/MEDIUM/LOW and return (priority, score, reason)."""
        with get_session() as session:
            article = session.query(
                ProcessedArticle.viral_score,
                ProcessedArticle.tech_score,
                ProcessedArticle.relevance_score,
                RawArticle.source,
                RawArticle.fetched_at
            ).join(
                RawArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                ProcessedArticle.id == article_id
            ).first()
            
            if not article:
                return "LOW", 0.0, "Article not found"
            
            # Map result to dict for calculation
            row = {
                "viral_score": article[0],
                "tech_score": article[1],
                "relevance_score": article[2],
                "source": article[3],
                "fetched_at": article[4]
            }
            
            score = self.calculate_weighted_score(row)
            
            # Adjusted thresholds for 0-120 range (Weighted Score)
            if score >= 85:
                priority = "HIGH"
                reason = "High combined viral, tech and relevance score"
            elif score >= 50:
                priority = "MEDIUM"
                reason = "Moderate impact potential"
            else:
                priority = "LOW"
                reason = "Low composite score"
                
            return priority, score, reason

    def process_all_priorities(self) -> int:
        """Update priority, priority_score, and priority_reason for all processed articles."""
        count = 0
        with get_session() as session:
            articles = session.query(
                ProcessedArticle.id,
                ProcessedArticle.raw_article_id
            ).join(
                RawArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                RawArticle.state == 'scored'
            ).all()

            if debug:
                log.info("decision_candidates state=scored count=%d", len(articles))
            
            for pid, raw_id in articles:
                # Atomic claim
                result = session.execute(
                    sql_update(RawArticle)
                    .where(RawArticle.id == raw_id, RawArticle.state == 'scored')
                    .values(state='deciding')
                )
                session.commit()
                
                if result.rowcount == 0:
                    continue

                priority, score, reason = self.classify_priority(pid)

                if debug:
                    log.info(
                        "priority_classified pid=%s raw_id=%s priority=%s score=%s reason=%r",
                        pid,
                        raw_id,
                        priority,
                        score,
                        reason,
                    )
                
                session.execute(
                    sql_update(ProcessedArticle)
                    .where(ProcessedArticle.id == pid)
                    .values(
                        priority=priority,
                        priority_score=score,
                        priority_reason=reason
                    )
                )
                
                session.execute(
                    sql_update(RawArticle)
                    .where(RawArticle.id == raw_id)
                    .values(state='decided')
                )
                
                count += 1
            
            session.commit()
        return count

    def generate_image_prompt(self, article_title: str, summary: str) -> str:
        """Generate a high-quality visual prompt for AI image generation."""
        prompt = f"""Create a highly descriptive visual prompt for an AI image generator based on this AI technical article.
        
        Title: {article_title}
        Summary: {summary}
        
        Requirements:
        - Style: Futuristic, cinematic, high-tech, cyberpunk or minimalist 3D.
        - Focus on abstract concepts like neural networks, glowing circuits, or data flows.
        - NO TEXT in the image.
        
        Visual Prompt:"""
        
        try:
            # Use the existing LLM client
            response = self.llm.generate(prompt, max_tokens=150)
            clean_prompt = response.strip().split('\n')[0].replace('"', '')
            return clean_prompt if clean_prompt else f"Futuristic representation of {article_title}"
        except:
            return f"A professional high-tech conceptual visualization of {article_title}"

    def generate_daily_summary(self) -> str:
        """Generate top 3 stories summary and save to daily_intelligence."""
        today = datetime.now().strftime("%Y-%m-%d")
        
        with get_session() as session:
            articles = session.query(
                RawArticle.title,
                ProcessedArticle.priority_reason,
                ProcessedArticle.priority_score,
                ProcessedArticle.summary,
                ProcessedArticle.id
            ).join(
                RawArticle,
                ProcessedArticle.raw_article_id == RawArticle.id
            ).filter(
                RawArticle.state.in_(['decided', 'generated', 'published', 'scored'])
            ).order_by(
                ProcessedArticle.priority_score.desc()
            ).limit(3).all()
            
            if not articles:
                return "No articles found to summarize."

            top_stories = []
            for title, reason, score, summary, aid in articles:
                # Generate angle using LLM
                angle = self._generate_angle(title, summary)
                top_stories.append({
                    "title": title,
                    "reason": reason,
                    "angle": angle,
                    "impact_score": min(int(score), 100) if score else 0
                })

            json_summary = json.dumps(top_stories)
            
            # Use PostgreSQL upsert
            stmt = pg_insert(DailyIntelligence).values(
                date=today,
                top_stories_json=json_summary
            ).on_conflict_do_update(
                index_elements=['date'],
                set_={'top_stories_json': json_summary}
            )
            session.execute(stmt)
            session.commit()
            
            # Formulate text output for console/logs
            output = f"\nTop 3 articles today ({today}):\n"
            for s in top_stories:
                output += f"- {s['title']}\n"
                output += f"  Reason: {s['reason']}\n"
                output += f"  Angle: {s['angle']}\n"
                output += f"  Impact: {s['impact_score']}\n"
            
            return output

    def _generate_angle(self, title: str, summary: str) -> str:
        """Use LLM to suggest a content angle."""
        prompt = f"""Given the AI news article below, suggest a unique and engaging content angle for a social media post or blog.
        
ARTICLE: {title}
SUMMARY: {summary}

Suggested Angle (1 sentence):"""
        try:
            return self.llm.generate(prompt, max_tokens=100).strip()
        except Exception as e:
            log.error(f"Failed to generate angle: {e}")
            return "General news update and analysis."

decision_engine = DecisionEngine()

if __name__ == "__main__":
    import sqlite3 # Import for the Row check inside class
    logging.basicConfig(level=logging.INFO)
    print(decision_engine.generate_daily_summary())
