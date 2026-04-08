from __future__ import annotations

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass

from backend.db.session import get_session
from ..models import ScheduledPost as ScheduledPostModel, GeneratedContent


@dataclass
class ScheduledPost:
    id: int
    article_id: int
    platform: str
    content: str
    scheduled_time: datetime
    status: str  # 'pending', 'posted', 'failed'
    created_at: datetime


class ContentScheduler:
    """Schedule content posts across platforms with optimal timing."""
    
    def __init__(self):
        self.log = logging.getLogger("content_scheduler")
        
        # Optimal posting times by platform (UTC)
        self.optimal_times = {
            "twitter": [13, 17, 20],  # 1PM, 5PM, 8PM UTC
            "linkedin": [8, 12, 17],  # 8AM, 12PM, 5PM UTC  
            "reddit": [14, 20, 22],   # 2PM, 8PM, 10PM UTC
            "facebook": [13, 15, 19], # 1PM, 3PM, 7PM UTC
            "instagram": [11, 14, 17], # 11AM, 2PM, 5PM UTC
        }
    
    def create_schedule_table(self):
        """Create the scheduled_posts table if it doesn't exist."""
        # Table is managed by Alembic migrations - no need to create
        pass
    
    def schedule_content(self, article_id: int, platforms: List[str], 
                        start_date: Optional[datetime] = None) -> List[int]:
        """Schedule content for multiple platforms with optimal timing."""
        self.create_schedule_table()
        
        if start_date is None:
            start_date = datetime.now(timezone.utc) + timedelta(hours=1)
        
        scheduled_ids = []
        
        with get_session() as session:
            # Get generated content for this article
            content_results = session.query(
                GeneratedContent.platform,
                GeneratedContent.content
            ).filter(
                GeneratedContent.article_id == article_id,
                GeneratedContent.platform.in_(platforms)
            ).all()
            
            content_map = dict(content_results)
            
            for platform in platforms:
                if platform not in content_map:
                    self.log.warning("no_content_for_platform article_id=%s platform=%s", 
                                   article_id, platform)
                    continue
                
                # Calculate optimal posting time
                scheduled_time = self._get_optimal_time(platform, start_date)
                
                # Insert scheduled post
                new_post = ScheduledPostModel(
                    article_id=article_id,
                    platform=platform,
                    scheduled_time=scheduled_time,
                    status='pending'
                )
                session.add(new_post)
                session.flush()  # Get the ID
                
                scheduled_ids.append(new_post.id)
                
                self.log.info("content_scheduled article_id=%s platform=%s time=%s", 
                            article_id, platform, scheduled_time)
            
            session.commit()
        
        return scheduled_ids
    
    def _get_optimal_time(self, platform: str, base_date: datetime) -> datetime:
        """Get the next optimal posting time for a platform."""
        optimal_hours = self.optimal_times.get(platform, [12, 16, 20])
        
        # Find next optimal hour
        current_hour = base_date.hour
        next_hour = None
        
        for hour in optimal_hours:
            if hour > current_hour:
                next_hour = hour
                break
        
        if next_hour is None:
            # Use first optimal time tomorrow
            next_hour = optimal_hours[0]
            base_date = base_date + timedelta(days=1)
        
        return base_date.replace(hour=next_hour, minute=0, second=0, microsecond=0)
    
    def get_pending_posts(self, limit: int = 50) -> List[ScheduledPost]:
        """Get posts ready to be published."""
        self.create_schedule_table()
        
        with get_session() as session:
            posts = session.query(ScheduledPostModel).filter(
                ScheduledPostModel.status == 'pending',
                ScheduledPostModel.scheduled_time <= datetime.now(timezone.utc)
            ).order_by(
                ScheduledPostModel.scheduled_time.asc()
            ).limit(limit).all()
            
            return [
                ScheduledPost(
                    id=post.id,
                    article_id=post.article_id,
                    platform=post.platform,
                    content="",  # Content not stored in model anymore
                    scheduled_time=post.scheduled_time,
                    status=post.status,
                    created_at=post.created_at
                )
                for post in posts
            ]
    
    def mark_posted(self, post_id: int, success: bool = True, error: str = None):
        """Mark a scheduled post as completed."""
        with get_session() as session:
            post = session.get(ScheduledPostModel, post_id)
            if post:
                post.status = 'posted' if success else 'failed'
                post.error_message = error
                session.commit()
                
                self.log.info("post_marked post_id=%s status=%s", post_id, post.status)


def main():
    """Test the content scheduler."""
    scheduler = ContentScheduler()
    scheduler.create_schedule_table()
    
    # Example: Schedule content for article 1 on Twitter and LinkedIn
    scheduled = scheduler.schedule_content(1, ['twitter', 'linkedin'])
    print(f"Scheduled {len(scheduled)} posts")
    
    # Check pending posts
    pending = scheduler.get_pending_posts()
    print(f"Found {len(pending)} pending posts")


if __name__ == "__main__":
    main()