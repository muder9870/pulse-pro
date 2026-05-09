from __future__ import annotations
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, 
    ForeignKey, UniqueConstraint, Index, Table, REAL
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func

class Base(DeclarativeBase):
    pass

class RawArticle(Base):
    __tablename__ = "raw_articles"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String)
    source: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String, unique=True)
    author: Mapped[Optional[str]] = mapped_column(String)
    raw_content: Mapped[Optional[str]] = mapped_column(Text)
    fetched_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    processed: Mapped[int] = mapped_column(Integer, default=0)
    is_duplicate: Mapped[int] = mapped_column(Integer, default=0)
    state: Mapped[str] = mapped_column(String, default="pending")
    
    # Retry logic fields
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    retry_after: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    processed_entry: Mapped[Optional["ProcessedArticle"]] = relationship(back_populates="raw_article", uselist=False)

class ProcessedArticle(Base):
    __tablename__ = "processed_articles"

    # Enforce 1-to-1 with RawArticle at the DB level.
    # Without this, retries can insert duplicate rows causing SAWarning.
    __table_args__ = (
        UniqueConstraint("raw_article_id", name="uq_processed_articles_raw_article_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    raw_article_id: Mapped[int] = mapped_column(
        ForeignKey("raw_articles.id"), nullable=False, index=True
    )
    summary: Mapped[str] = mapped_column(Text, default="")
    key_takeaways: Mapped[str] = mapped_column(Text, default="")
    viral_score: Mapped[Optional[int]] = mapped_column(Integer)
    tech_score: Mapped[Optional[int]] = mapped_column(Integer)
    viral_hook: Mapped[str] = mapped_column(Text, default="")
    key_innovation: Mapped[str] = mapped_column(Text, default="")
    implication: Mapped[str] = mapped_column(Text, default="")
    relevance_score: Mapped[Optional[int]] = mapped_column(Integer)
    sentiment: Mapped[Optional[str]] = mapped_column(String)
    category: Mapped[Optional[str]] = mapped_column(String)
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Decision Engine fields
    priority: Mapped[str] = mapped_column(String, default="LOW")
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority_reason: Mapped[Optional[str]] = mapped_column(Text)
    generated: Mapped[int] = mapped_column(Integer, default=0)

    # Pipeline / StoryCard workflow (exposed on GET /api/stories as review_status, needs_review, etc.)
    story_review_status: Mapped[str] = mapped_column(String(32), default="none")  # none | pending | approved
    content_approved: Mapped[bool] = mapped_column(Boolean, default=False)
    pipeline_needs_review: Mapped[bool] = mapped_column(Boolean, default=False)
    ready_to_schedule: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # LLM Validation fields (Phase A)
    llm_raw_output: Mapped[Optional[str]] = mapped_column(Text)
    llm_validation_error: Mapped[Optional[str]] = mapped_column(Text)
    llm_fallback: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    raw_article: Mapped["RawArticle"] = relationship(back_populates="processed_entry")
    generated_contents: Mapped[List["GeneratedContent"]] = relationship(back_populates="processed_article")
    tags: Mapped[List["ArticleTag"]] = relationship(back_populates="processed_article")
    blog_post: Mapped[Optional["BlogPost"]] = relationship(back_populates="processed_article", uselist=False)
    paper_analysis: Mapped[Optional["PaperAnalysis"]] = relationship(back_populates="processed_article", uselist=False)

class GeneratedContent(Base):
    __tablename__ = "generated_content"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    char_count: Mapped[int] = mapped_column(Integer)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    posted: Mapped[int] = mapped_column(Integer, default=0)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    
    # Relationships
    processed_article: Mapped["ProcessedArticle"] = relationship(back_populates="generated_contents")

class DailyIntelligence(Base):
    __tablename__ = "daily_intelligence"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date: Mapped[str] = mapped_column(String, unique=True)
    top_stories_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    key: Mapped[str] = mapped_column(String, unique=True)
    value: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class ArticleTag(Base):
    __tablename__ = "article_tags"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    tag: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("article_id", "tag"),)
    
    # Relationships
    processed_article: Mapped["ProcessedArticle"] = relationship(back_populates="tags")

class TrendingHashtag(Base):
    __tablename__ = "trending_hashtags"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hashtag: Mapped[str] = mapped_column(String)
    platform: Mapped[str] = mapped_column(String)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    growth_rate: Mapped[float] = mapped_column(Float, default=0.0)
    trend_score: Mapped[int] = mapped_column(Integer, default=0)
    category: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="active")
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("hashtag", "platform"),)

class BlogPost(Base):
    __tablename__ = "blog_posts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"), unique=True)
    title: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(Text)
    excerpt: Mapped[Optional[str]] = mapped_column(Text)
    focus_keyword: Mapped[Optional[str]] = mapped_column(String)
    meta_description: Mapped[Optional[str]] = mapped_column(Text)
    readability_score: Mapped[Optional[float]] = mapped_column(Float)
    platform_slugs: Mapped[Optional[str]] = mapped_column(Text)
    alt_text_suggestions: Mapped[Optional[str]] = mapped_column(Text)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    reading_time: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String, default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    processed_article: Mapped["ProcessedArticle"] = relationship(back_populates="blog_post")
    publications: Mapped[List["BlogPublication"]] = relationship(back_populates="blog_post")

class BlogPublication(Base):
    __tablename__ = "blog_publications"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    blog_post_id: Mapped[int] = mapped_column(ForeignKey("blog_posts.id"))
    platform: Mapped[str] = mapped_column(String)
    platform_post_id: Mapped[Optional[str]] = mapped_column(String)
    url: Mapped[Optional[str]] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, default="pending")
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Relationships
    blog_post: Mapped["BlogPost"] = relationship(back_populates="publications")

class SystemStatus(Base):
    __tablename__ = "system_status"
    
    service_name: Mapped[str] = mapped_column(String, primary_key=True)
    status: Mapped[str] = mapped_column(String)
    last_run_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    last_error: Mapped[Optional[str]] = mapped_column(Text)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

class HealthHistory(Base):
    __tablename__ = "health_history"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    service_name: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class PaperAnalysis(Base):
    __tablename__ = "paper_analysis"
    
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"), primary_key=True)
    methodology: Mapped[Optional[str]] = mapped_column(Text)
    limitations: Mapped[Optional[str]] = mapped_column(Text)
    results: Mapped[Optional[str]] = mapped_column(Text)
    citations_count: Mapped[int] = mapped_column(Integer, default=0)
    authors: Mapped[Optional[str]] = mapped_column(Text)
    affiliations: Mapped[Optional[str]] = mapped_column(Text)
    analyzed_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    # Relationships
    processed_article: Mapped["ProcessedArticle"] = relationship(back_populates="paper_analysis")

class Webhook(Base):
    __tablename__ = "webhooks"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    secret: Mapped[Optional[str]] = mapped_column(String)
    events: Mapped[Optional[str]] = mapped_column(Text)
    enabled: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class ScheduledPost(Base):
    __tablename__ = "scheduled_posts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    scheduled_time: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String, default="pending")
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Additional Indices for PostgreSQL Performance
Index("idx_raw_articles_fetched_at", RawArticle.fetched_at)
class EngagementMetric(Base):
    __tablename__ = "engagement_metrics"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    raw_article_id: Mapped[Optional[int]] = mapped_column(ForeignKey("raw_articles.id"))
    platform: Mapped[Optional[str]] = mapped_column(String)
    metric_type: Mapped[str] = mapped_column(String)
    metric_value: Mapped[float] = mapped_column(Float, default=1.0)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class UserStyle(Base):
    __tablename__ = "user_styles"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String, default="generic", index=True)  # Platform-specific learning
    key: Mapped[str] = mapped_column(String)
    value: Mapped[str] = mapped_column(String)
    last_updated: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (
        UniqueConstraint("platform", "key", name="uq_platform_key"),
    )

class ArticleImage(Base):
    __tablename__ = "article_images"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    image_url: Mapped[Optional[str]] = mapped_column(String)
    local_path: Mapped[Optional[str]] = mapped_column(String)
    media_type: Mapped[str] = mapped_column(String)
    prompt: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class ArticleAudio(Base):
    __tablename__ = "article_audio"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[Optional[int]] = mapped_column(ForeignKey("processed_articles.id"))
    audio_url: Mapped[Optional[str]] = mapped_column(String)
    local_path: Mapped[Optional[str]] = mapped_column(String)
    voice: Mapped[Optional[str]] = mapped_column(String)
    duration: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Core Performance Indexes
Index("idx_raw_articles_state", RawArticle.state)
Index("idx_raw_articles_retry", RawArticle.state, RawArticle.retry_after)
Index("idx_raw_articles_source", RawArticle.source)
Index("idx_processed_articles_raw_id", ProcessedArticle.raw_article_id)
Index("idx_processed_articles_viral_score", ProcessedArticle.viral_score)
Index("idx_generated_content_article_platform", GeneratedContent.article_id, GeneratedContent.platform)
Index("idx_article_tags_article_id", ArticleTag.article_id)
Index("idx_article_tags_tag", ArticleTag.tag)

# Additional Performance Indexes
Index("idx_scheduled_posts_status_time", ScheduledPost.status, ScheduledPost.scheduled_time)
Index("idx_health_history_service", HealthHistory.service_name, HealthHistory.created_at)
Index("idx_engagement_article_type", EngagementMetric.raw_article_id, EngagementMetric.metric_type)
Index("idx_article_images_article", ArticleImage.article_id)
Index("idx_article_audio_article", ArticleAudio.article_id)

# ============================================================================
# MISSING MODELS - Added during PostgreSQL Clean Rebuild (Feb 24, 2026)
# ============================================================================

# RSS Feed Management
class RSSFeed(Base):
    __tablename__ = "rss_feeds"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
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
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
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
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
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
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Hashtag Analytics
class HashtagPerformance(Base):
    __tablename__ = "hashtag_performance"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hashtag: Mapped[str] = mapped_column(String)
    platform: Mapped[str] = mapped_column(String)
    volume: Mapped[int] = mapped_column(Integer, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0.0)
    growth_rate: Mapped[float] = mapped_column(Float, default=0.0)
    trend_score: Mapped[int] = mapped_column(Integer, default=0)
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class ContentHashtag(Base):
    __tablename__ = "content_hashtags"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
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
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String, unique=True)
    api_key: Mapped[Optional[str]] = mapped_column(String)
    site_url: Mapped[Optional[str]] = mapped_column(String)
    username: Mapped[Optional[str]] = mapped_column(String)
    enabled: Mapped[int] = mapped_column(Integer, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Analytics
class PlatformROI(Base):
    __tablename__ = "platform_roi"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    platform: Mapped[str] = mapped_column(String)
    total_content: Mapped[int] = mapped_column(Integer, default=0)
    total_chars: Mapped[int] = mapped_column(Integer, default=0)
    time_saved_hours: Mapped[float] = mapped_column(Float, default=0.0)
    engagement_score: Mapped[float] = mapped_column(Float, default=0.0)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("platform", "timestamp"),)

class TopicTrend(Base):
    __tablename__ = "topic_trends"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    topic: Mapped[str] = mapped_column(String)
    occurrence_count: Mapped[int] = mapped_column(Integer, default=0)
    avg_viral_score: Mapped[float] = mapped_column(Float, default=0.0)
    detected_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    
    __table_args__ = (UniqueConstraint("topic", "detected_at"),)

# Monetization
class AffiliateLink(Base):
    __tablename__ = "affiliate_links"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String, unique=True)
    url: Mapped[str] = mapped_column(String)
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used: Mapped[Optional[datetime]] = mapped_column(DateTime)

# User Feedback
class UserFeedback(Base):
    __tablename__ = "user_feedback"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    is_positive: Mapped[bool] = mapped_column(Boolean)
    comment: Mapped[Optional[str]] = mapped_column(Text)
    original_content: Mapped[Optional[str]] = mapped_column(Text)
    edited_content: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class LLMCache(Base):
    __tablename__ = "llm_cache"
    
    prompt_hash: Mapped[str] = mapped_column(String(32), primary_key=True)
    prompt: Mapped[str] = mapped_column(Text)
    response: Mapped[str] = mapped_column(Text)
    model: Mapped[str] = mapped_column(String)
    hit_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    last_accessed_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

# Video Generation
class VideoScript(Base):
    __tablename__ = "video_scripts"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    article_id: Mapped[int] = mapped_column(ForeignKey("processed_articles.id"))
    platform: Mapped[str] = mapped_column(String)
    script_text: Mapped[str] = mapped_column(Text)
    visual_cues: Mapped[Optional[str]] = mapped_column(Text)
    duration_est: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

class IdempotencyLog(Base):
    __tablename__ = "idempotency_logs"
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, nullable=False)
    article_id = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RelevanceKeyword(Base):
    __tablename__ = "relevance_keywords"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    category: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=func.now(), onupdate=func.now()
    )

# ============================================================================
# INDICES FOR NEW MODELS
# ============================================================================

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
Index("idx_idempotency_created_at", IdempotencyLog.created_at)
Index("idx_video_scripts_article", VideoScript.article_id)
Index("idx_relevance_keywords_keyword", RelevanceKeyword.keyword)
