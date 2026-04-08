import logging
from datetime import datetime, timedelta
import random
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository

class SchedulingEngine:
    def __init__(self):
        self.logger = logging.getLogger("scheduling_engine")
        # Optimal windows (ranges of hours 0-23)
        self.platform_windows = {
            "twitter": [9, 12, 18, 21], # Noon and evening peak
            "linkedin": [8, 9, 10, 11, 17], # Professional morning peak
            "reddit": [6, 7, 8, 9], # Early morning for US audience
            "medium": [7, 8, 9] # Deep read mornings
        }

    def calculate_optimal_time(self, platform: str) -> datetime:
        """Calculate the next 'optimal' slot for a platform."""
        now = datetime.now()
        hours = self.platform_windows.get(platform.lower(), [9, 12, 15, 18])
        
        # Try to find a slot today
        for h in sorted(hours):
            potential = now.replace(hour=h, minute=random.randint(0, 59), second=0, microsecond=0)
            if potential > now + timedelta(minutes=30): # Give 30 min buffer
                return potential
        
        # Fallback: first slot tomorrow
        return (now + timedelta(days=1)).replace(hour=hours[0], minute=random.randint(0, 59))

    def process_queue(self) -> None:
        """Find pending posts that should be posted now and trigger them."""
        self.logger.info("Processing scheduled posting queue...")
        now = datetime.now()  # Keep as datetime object for comparison
        
        db = SessionLocal()
        try:
            repo = SystemRepository(db)
            pending = repo.list_scheduled_posts(status='pending', limit=10)
            to_post = [p for p in pending if p['scheduled_time'] <= now]
            
            if not to_post:
                self.logger.info("No posts ready for publishing.")
                return

            for post in to_post:
                try:
                    self.logger.info(f"Publishing article {post['article_id']} to {post['platform']}")
                    # This will call the SocialPublisher in the next step
                    from backend.generators.social_publishers import social_publisher
                    success, error = social_publisher.publish(post['article_id'], post['platform'])
                    
                    if success:
                        repo.update_scheduled_post_status(post['id'], 'posted')
                        self.logger.info(f"Successfully posted {post['id']}")
                    else:
                        repo.update_scheduled_post_status(post['id'], 'failed', error)
                        self.logger.error(f"Failed to post {post['id']}: {error}")
                except Exception as e:
                    repo.update_scheduled_post_status(post['id'], 'failed', str(e))
                    self.logger.error(f"Error processing post {post['id']}: {e}")
        finally:
            db.close()

# Singleton instance
scheduling_engine = SchedulingEngine()
