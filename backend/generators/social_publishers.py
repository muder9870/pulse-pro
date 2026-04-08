import logging
import os
import requests
import json
from datetime import datetime
from backend.db.session import SessionLocal, get_session
from backend.db.repositories.content_repository import ContentRepository
from backend.models import GeneratedContent, ProcessedArticle, RawArticle
from sqlalchemy.orm import joinedload

class SocialPublisher:
    def __init__(self):
        self.logger = logging.getLogger("social_publisher")
        self.simulation_mode = os.getenv("SOCIAL_SIMULATION_MODE", "false").lower() == "true"
        self.webhook_url = os.getenv("SOCIAL_WEBHOOK_URL")

    def publish(self, article_id: int, platform: str) -> tuple[bool, str | None]:
        """Publish content for an article to a specific platform."""
        try:
            with get_session() as session:
                # Fetch generated content and title for reference
                result = session.query(
                    GeneratedContent.content,
                    RawArticle.title
                ).join(
                    ProcessedArticle, GeneratedContent.article_id == ProcessedArticle.id
                ).join(
                    RawArticle, ProcessedArticle.raw_article_id == RawArticle.id
                ).filter(
                    GeneratedContent.article_id == article_id,
                    GeneratedContent.platform == platform
                ).order_by(
                    GeneratedContent.generated_at.desc()
                ).first()
                
                if not result:
                    return False, f"No content found for article {article_id} on {platform}"
                
                content, title = result

            # If simulation mode is on, use it for all implementations
            if self.simulation_mode:
                return self._publish_simulated(content, article_id, platform, title)

            # Platform dispatch logic
            if platform.lower() == 'twitter':
                return self._publish_twitter(content, article_id)
            elif platform.lower() == 'linkedin':
                return self._publish_linkedin(content, article_id)
            elif platform.lower() == 'webhook':
                return self._publish_webhook(content, article_id, title)
            else:
                return False, f"Publishing not implemented for {platform}"

        except Exception as e:
            self.logger.error(f"Failed to publish to {platform}: {e}")
            return False, str(e)

    def _publish_webhook(self, content: str, article_id: int, title: str) -> tuple[bool, str | None]:
        """Send content to a generic webhook."""
        if not self.webhook_url:
            return False, "SOCIAL_WEBHOOK_URL not configured."
        
        try:
            payload = {
                "article_id": article_id,
                "title": title,
                "content": content,
                "timestamp": datetime.now().isoformat()
            }
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            if response.status_code < 300:
                with get_session() as session:
                    repo = ContentRepository(session)
                    repo.set_posted(article_id, "webhook", True)
                return True, f"Successfully sent to webhook: {response.status_code}"
            else:
                return False, f"Webhook failed with status {response.status_code}: {response.text}"
        except Exception as e:
            return False, f"Webhook error: {str(e)}"

    def _publish_simulated(self, content: str, article_id: int, platform: str, title: str) -> tuple[bool, str | None]:
        """Log the post to a simulation file and database."""
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        sim_log = os.path.join(log_dir, "social_simulation.log")
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        entry = (
            f"--- SIMULATED POST ---\n"
            f"Time: {timestamp}\n"
            f"Platform: {platform}\n"
            f"Article ID: {article_id}\n"
            f"Title: {title}\n"
            f"Content:\n{content}\n"
            f"----------------------\n\n"
        )
        
        with open(sim_log, "a", encoding="utf-8") as f:
            f.write(entry)
            
        with get_session() as session:
            repo = ContentRepository(session)
            repo.set_posted(article_id, platform, True)
        return True, f"Simulation successful. Logged to {sim_log}"

    def _publish_twitter(self, content: str, article_id: int) -> tuple[bool, str | None]:
        """Twitter API implementation placeholder (requires API keys)."""
        # Future: Use tweepy here
        return False, "Twitter API keys not configured. Use simulation mode for testing."

    def _publish_linkedin(self, content: str, article_id: int) -> tuple[bool, str | None]:
        """LinkedIn API implementation placeholder (requires API keys)."""
        # Future: Use linkedin-v2 API
        return False, "LinkedIn API keys not configured. Use simulation mode for testing."

# Singleton instance
social_publisher = SocialPublisher()
