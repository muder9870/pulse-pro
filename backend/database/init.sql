-- AI Pulse Pro — PostgreSQL Initialization Script
-- This file runs once on first `docker compose up` when the postgres_data volume is empty.
-- All subsequent schema changes are handled by Alembic migrations.

-- raw_articles
CREATE TABLE IF NOT EXISTS raw_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    category VARCHAR,
    source VARCHAR NOT NULL,
    url VARCHAR UNIQUE NOT NULL,
    author VARCHAR,
    raw_content TEXT,
    fetched_at TIMESTAMP DEFAULT NOW(),
    processed INTEGER DEFAULT 0,
    is_duplicate INTEGER DEFAULT 0,
    state VARCHAR DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    retry_after TIMESTAMP
);

-- processed_articles
CREATE TABLE IF NOT EXISTS processed_articles (
    id SERIAL PRIMARY KEY,
    raw_article_id INTEGER NOT NULL REFERENCES raw_articles(id),
    summary TEXT DEFAULT '',
    key_takeaways TEXT DEFAULT '',
    viral_score INTEGER,
    tech_score INTEGER,
    viral_hook TEXT DEFAULT '',
    key_innovation TEXT DEFAULT '',
    implication TEXT DEFAULT '',
    relevance_score INTEGER,
    sentiment VARCHAR,
    category VARCHAR,
    processed_at TIMESTAMP DEFAULT NOW(),
    priority VARCHAR DEFAULT 'LOW',
    priority_score FLOAT DEFAULT 0.0,
    priority_reason TEXT,
    generated INTEGER DEFAULT 0,
    llm_raw_output TEXT,
    llm_validation_error TEXT,
    llm_fallback INTEGER DEFAULT 0,
    story_review_status VARCHAR(32) DEFAULT 'none',
    content_approved BOOLEAN DEFAULT FALSE,
    pipeline_needs_review BOOLEAN DEFAULT FALSE,
    ready_to_schedule BOOLEAN DEFAULT FALSE,
    CONSTRAINT uq_processed_articles_raw_article_id UNIQUE (raw_article_id)
);

-- generated_content
CREATE TABLE IF NOT EXISTS generated_content (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    generated_at TIMESTAMP DEFAULT NOW(),
    posted INTEGER DEFAULT 0,
    posted_at TIMESTAMP
);

-- daily_intelligence
CREATE TABLE IF NOT EXISTS daily_intelligence (
    id SERIAL PRIMARY KEY,
    date VARCHAR UNIQUE NOT NULL,
    top_stories_json TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- user_preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    value VARCHAR NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- article_tags
CREATE TABLE IF NOT EXISTS article_tags (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    tag VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_article_tags_article_tag UNIQUE (article_id, tag)
);

-- trending_hashtags
CREATE TABLE IF NOT EXISTS trending_hashtags (
    id SERIAL PRIMARY KEY,
    hashtag VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    volume INTEGER DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0.0,
    growth_rate FLOAT DEFAULT 0.0,
    trend_score INTEGER DEFAULT 0,
    category VARCHAR,
    status VARCHAR DEFAULT 'active',
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_trending_hashtags_hashtag_platform UNIQUE (hashtag, platform)
);

-- blog_posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER UNIQUE REFERENCES processed_articles(id),
    title VARCHAR NOT NULL,
    slug VARCHAR NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,
    focus_keyword VARCHAR,
    meta_description TEXT,
    readability_score FLOAT,
    platform_slugs TEXT,
    alt_text_suggestions TEXT,
    word_count INTEGER DEFAULT 0,
    reading_time INTEGER DEFAULT 0,
    status VARCHAR DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- blog_publications
CREATE TABLE IF NOT EXISTS blog_publications (
    id SERIAL PRIMARY KEY,
    blog_post_id INTEGER REFERENCES blog_posts(id),
    platform VARCHAR NOT NULL,
    platform_post_id VARCHAR,
    url VARCHAR,
    status VARCHAR DEFAULT 'pending',
    published_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- system_status
CREATE TABLE IF NOT EXISTS system_status (
    service_name VARCHAR PRIMARY KEY,
    status VARCHAR NOT NULL,
    last_run_at TIMESTAMP DEFAULT NOW(),
    last_error TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- health_history
CREATE TABLE IF NOT EXISTS health_history (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- paper_analysis
CREATE TABLE IF NOT EXISTS paper_analysis (
    article_id INTEGER PRIMARY KEY REFERENCES processed_articles(id),
    methodology TEXT,
    limitations TEXT,
    results TEXT,
    citations_count INTEGER DEFAULT 0,
    authors TEXT,
    affiliations TEXT,
    analyzed_at TIMESTAMP DEFAULT NOW()
);

-- webhooks
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    secret VARCHAR,
    events TEXT,
    enabled INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- scheduled_posts
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    status VARCHAR DEFAULT 'pending',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- engagement_metrics
CREATE TABLE IF NOT EXISTS engagement_metrics (
    id SERIAL PRIMARY KEY,
    raw_article_id INTEGER REFERENCES raw_articles(id),
    platform VARCHAR,
    metric_type VARCHAR NOT NULL,
    metric_value FLOAT DEFAULT 1.0,
    recorded_at TIMESTAMP DEFAULT NOW()
);

-- user_styles
CREATE TABLE IF NOT EXISTS user_styles (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) DEFAULT 'generic' NOT NULL,
    key VARCHAR NOT NULL,
    value VARCHAR NOT NULL,
    confidence FLOAT DEFAULT 0.5 NOT NULL,
    occurrences INTEGER DEFAULT 1 NOT NULL,
    last_updated TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_platform_key UNIQUE (platform, key)
);

-- relevance_keywords
CREATE TABLE IF NOT EXISTS relevance_keywords (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR UNIQUE NOT NULL,
    category VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- article_images
CREATE TABLE IF NOT EXISTS article_images (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    image_url VARCHAR,
    local_path VARCHAR,
    media_type VARCHAR NOT NULL,
    prompt TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- article_audio
CREATE TABLE IF NOT EXISTS article_audio (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    audio_url VARCHAR,
    local_path VARCHAR,
    voice VARCHAR,
    duration INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- rss_feeds
CREATE TABLE IF NOT EXISTS rss_feeds (
    id SERIAL PRIMARY KEY,
    url VARCHAR UNIQUE NOT NULL,
    title VARCHAR,
    description TEXT,
    category VARCHAR,
    active INTEGER DEFAULT 1,
    last_fetched TIMESTAMP,
    last_error TEXT,
    fetch_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- rss_feed_items
CREATE TABLE IF NOT EXISTS rss_feed_items (
    id SERIAL PRIMARY KEY,
    feed_id INTEGER REFERENCES rss_feeds(id),
    guid VARCHAR NOT NULL,
    url VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    published_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_rss_feed_items_feed_guid UNIQUE (feed_id, guid)
);

-- gmail_newsletter_senders
CREATE TABLE IF NOT EXISTS gmail_newsletter_senders (
    id SERIAL PRIMARY KEY,
    sender_email VARCHAR UNIQUE NOT NULL,
    sender_name VARCHAR,
    sample_subject TEXT,
    confidence_score FLOAT DEFAULT 0.0,
    is_ai_related INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW()
);

-- content_history
CREATE TABLE IF NOT EXISTS content_history (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    action VARCHAR NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- hashtag_performance
CREATE TABLE IF NOT EXISTS hashtag_performance (
    id SERIAL PRIMARY KEY,
    hashtag VARCHAR NOT NULL,
    platform VARCHAR NOT NULL,
    volume INTEGER DEFAULT 0,
    engagement_rate FLOAT DEFAULT 0.0,
    growth_rate FLOAT DEFAULT 0.0,
    trend_score INTEGER DEFAULT 0,
    captured_at TIMESTAMP DEFAULT NOW()
);

-- content_hashtags
CREATE TABLE IF NOT EXISTS content_hashtags (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    hashtag VARCHAR NOT NULL,
    relevance_score FLOAT DEFAULT 0.0,
    trend_score INTEGER DEFAULT 0,
    final_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_content_hashtags_article_platform_hashtag UNIQUE (article_id, platform, hashtag)
);

-- blog_credentials
CREATE TABLE IF NOT EXISTS blog_credentials (
    id SERIAL PRIMARY KEY,
    platform VARCHAR UNIQUE NOT NULL,
    api_key VARCHAR,
    site_url VARCHAR,
    username VARCHAR,
    enabled INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- platform_roi
CREATE TABLE IF NOT EXISTS platform_roi (
    id SERIAL PRIMARY KEY,
    platform VARCHAR NOT NULL,
    total_content INTEGER DEFAULT 0,
    total_chars INTEGER DEFAULT 0,
    time_saved_hours FLOAT DEFAULT 0.0,
    engagement_score FLOAT DEFAULT 0.0,
    timestamp TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_platform_roi_platform_timestamp UNIQUE (platform, timestamp)
);

-- topic_trends
CREATE TABLE IF NOT EXISTS topic_trends (
    id SERIAL PRIMARY KEY,
    topic VARCHAR NOT NULL,
    occurrence_count INTEGER DEFAULT 0,
    avg_viral_score FLOAT DEFAULT 0.0,
    detected_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_topic_trends_topic_detected UNIQUE (topic, detected_at)
);

-- affiliate_links
CREATE TABLE IF NOT EXISTS affiliate_links (
    id SERIAL PRIMARY KEY,
    keyword VARCHAR UNIQUE NOT NULL,
    url VARCHAR NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_used TIMESTAMP
);

-- user_feedback
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    is_positive BOOLEAN NOT NULL,
    comment TEXT,
    original_content TEXT,
    edited_content TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- llm_cache
CREATE TABLE IF NOT EXISTS llm_cache (
    prompt_hash VARCHAR(32) PRIMARY KEY,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    model VARCHAR NOT NULL,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    last_accessed_at TIMESTAMP DEFAULT NOW()
);

-- video_scripts
CREATE TABLE IF NOT EXISTS video_scripts (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES processed_articles(id),
    platform VARCHAR NOT NULL,
    script_text TEXT NOT NULL,
    visual_cues TEXT,
    duration_est INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- idempotency_logs
CREATE TABLE IF NOT EXISTS idempotency_logs (
    id SERIAL PRIMARY KEY,
    key VARCHAR UNIQUE NOT NULL,
    article_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_raw_articles_fetched_at ON raw_articles(fetched_at);
CREATE INDEX IF NOT EXISTS idx_raw_articles_state ON raw_articles(state);
CREATE INDEX IF NOT EXISTS idx_raw_articles_retry ON raw_articles(state, retry_after);
CREATE INDEX IF NOT EXISTS idx_raw_articles_source ON raw_articles(source);
CREATE INDEX IF NOT EXISTS idx_processed_articles_raw_id ON processed_articles(raw_article_id);
CREATE INDEX IF NOT EXISTS idx_processed_articles_viral_score ON processed_articles(viral_score);
CREATE INDEX IF NOT EXISTS idx_generated_content_article_platform ON generated_content(article_id, platform);
CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_article_tags_tag ON article_tags(tag);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_time ON scheduled_posts(status, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_health_history_service ON health_history(service_name, created_at);
CREATE INDEX IF NOT EXISTS idx_engagement_article_type ON engagement_metrics(raw_article_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_article_images_article ON article_images(article_id);
CREATE INDEX IF NOT EXISTS idx_article_audio_article ON article_audio(article_id);
CREATE INDEX IF NOT EXISTS idx_rss_feeds_active ON rss_feeds(active);
CREATE INDEX IF NOT EXISTS idx_rss_feed_items_feed ON rss_feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_gmail_senders_active ON gmail_newsletter_senders(is_active);
CREATE INDEX IF NOT EXISTS idx_gmail_senders_email ON gmail_newsletter_senders(sender_email);
CREATE INDEX IF NOT EXISTS idx_content_history_article ON content_history(article_id);
CREATE INDEX IF NOT EXISTS idx_content_history_timestamp ON content_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_hashtag_perf_platform_time ON hashtag_performance(platform, captured_at);
CREATE INDEX IF NOT EXISTS idx_content_hashtags_article_platform ON content_hashtags(article_id, platform);
CREATE INDEX IF NOT EXISTS idx_blog_credentials_platform ON blog_credentials(platform);
CREATE INDEX IF NOT EXISTS idx_platform_roi_platform_time ON platform_roi(platform, timestamp);
CREATE INDEX IF NOT EXISTS idx_topic_trends_detected ON topic_trends(detected_at);
CREATE INDEX IF NOT EXISTS idx_topic_trends_topic ON topic_trends(topic);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_keyword ON affiliate_links(keyword);
CREATE INDEX IF NOT EXISTS idx_user_feedback_article ON user_feedback(article_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_created_at ON idempotency_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_video_scripts_article ON video_scripts(article_id);
CREATE INDEX IF NOT EXISTS idx_relevance_keywords_keyword ON relevance_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_user_styles_platform ON user_styles(platform);
