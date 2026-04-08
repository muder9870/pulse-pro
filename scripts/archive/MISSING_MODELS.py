# Missing Models for backend/models.py
# Add these to backend/models.py to complete the schema

from sqlalchemy import Index

# RSS Feed Management
class RSSFeed(Base):
    __tablename__ = "rss_feeds"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String, unique=True)
    title: Mapped[Optional[str]] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String)
    active: Mapped[int] = mapped_column(Integer, default=1)
    last_fetched: Mapped[Optional[datetime]] = mapped_column(DateTime)
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    fetch_count: Mapped[int] = mapped_column(Integer, default=0)
    error_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Relationships
    feed_items: Mapped[List["RSSFeedItem"]] = relationship(back_populates="feed")

class RSSFeedItem(Base):
    __tablename__ = "rss_feed_items"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    feed_id: Mapped[int] = mapped_column(ForeignKey("rss_feeds.id"))
    guid: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    title: Mapped[str] = mapped_column(String)
    published_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("feed_id", "guid"),)
    
    # Relationships
    feed: Mapped["RSSFeed"] = relationship(back_populates="feed_items")

# Gmail Newsletter Management
class GmailNewsletterSender(Base):
    __tablename__ = "gmail_newsletter_senders"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    sender_email: Mapped[str] = mapped_column(String, unique=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String)
    sample_subject: Mapped[Optional[str]] = mapped_column(Text)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    is_ai_related: Mapped[int] = mapped_column(Integer, default=0)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[int] = mapped_column(Integer, default=1)
    first_seen: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    last_seen: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Content Management
class ContentHistory(Base):
    __tablename__ = "content_history"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Hashtag Analytics
class HashtagPerformance(Base):
    __tablename__ = "hashtag_performance"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    hashtag: Mapped[str] = mapped_column(String)
    platform: Mapped[str] = mapped_column(String)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    growth_rate: Mapped[float] = mapped_column(Float, default=0.0)
    trend_score: Mapped[int] = mapped_column(Integer, default=0)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class ContentHashtag(Base):
    __tablename__ = "content_hashtags"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    hashtag: Mapped[str] = mapped_column(String)
    relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    trend_score: Mapped[int] = mapped_column(Integer, default=0)
    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("article_id", "platform", "hashtag"),)

# Blog Management
class BlogCredential(Base):
    __tablename__ = "blog_credentials"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    platform: Mapped[str] = mapped_column(String, unique=True)
    api_key: Mapped[Optional[str]] = mapped_column(String)
    site_url: Mapped[Optional[str]] = mapped_column(String)
    username: Mapped[Optional[str]] = mapped_column(String)
    enabled: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Analytics
class PlatformROI(Base):
    __tablename__ = "platform_roi"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    platform: Mapped[str] = mapped_column(String)
    total_content: Mapped[int] = mapped_column(Integer, default=0)
    total_chars: Mapped[int] = mapped_column(Integer, default=0)
    time_saved_hours: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("platform", "timestamp"),)

class TopicTrend(Base):
    __tablename__ = "topic_trends"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    topic: Mapped[str] = mapped_column(String)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_viral_score: Mapped[float] = mapped_column(Float, default=0.0)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("topic", "detected_at"),)

# Monetization
class AffiliateLink(Base):
    __tablename__ = "affiliate_links"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    keyword: Mapped[str] = mapped_column(String, unique=True)
    url: Mapped[str] = mapped_column(String)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime)

# User Feedback
class UserFeedback(Base):
    __tablename__ = "user_feedback"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    is_positive: Mapped[bool] = mapped_column(Boolean)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    original_content: Mapped[Optional[str]] = mapped_column(Text)
    edited_content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Video Generation
class VideoScript(Base):
    __tablename__ = "video_scripts"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    script_text: Mapped[str] = mapped_column(Text)
    visual_cues: Mapped[Optional[str]] = mapped_column(Text)
    duration_est: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Indices for Performance
Index("idx_rss_feeds_active", RSSFeed.active)
Index("idx_rss_feed_items_feed", RSSFeedItem.feed_id)
Index("idx_gmail_senders_active", GmailNewsletterSender.is_active)
Index("idx_gmail_senders_email", GmailNewsletterSender.sender_email)
Index("idx_content_history_article", ContentHistory.article_id)
Index("idx_content_history_timestamp", ContentHistory.timestamp)
Index("idx_hashtag_perf_platform_time", HashtagPerformance.platform, HashtagPerformance.captured_at)
Index("idx_content_hashtags_article_platform", ContentHashtag.article_id, ContentHashtag.platform)
Index("idx_blog_credentials_platform", BlogCredential.platform)
Index("idx_platform_roi_platform_time", PlatformROI.platform, PlatformROI.timestamp)
Index("idx_topic_trends_detected", TopicTrend.detected_at)
Index("idx_topic_trends_topic", TopicTrend.topic)
Index("idx_affiliate_links_keyword", AffiliateLink.keyword)
Index("idx_user_feedback_article", UserFeedback.article_id)
Index("idx_video_scripts_article", VideoScript.article_id)
