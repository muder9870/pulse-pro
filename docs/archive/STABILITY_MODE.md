# Stability Mode - AI Pulse Pro

**Date:** March 1, 2026  
**Status:** ✅ ACTIVE  
**Duration:** 6 months minimum

## Overview

AI Pulse Pro has entered **Stability Mode** to ensure reliable, long-term operation for a single operator. All external media service dependencies have been disabled, and the system now operates with core functionality only.

## Disabled Features

The following features are **permanently disabled** via feature flags:

### 1. Audio Generation (`FEATURE_AUDIO=false`)
- **Endpoint:** `/api/generate/audio/<article_id>`
- **Reason:** Edge TTS service unreliable (403 errors)
- **Response:** Returns structured JSON indicating feature is disabled
- **Impact:** No audio files generated for articles

### 2. AI Image Generation (`FEATURE_IMAGE=false`)
- **Endpoint:** `/api/generate/image`
- **Reason:** Ollama image generation not configured
- **Response:** Returns structured JSON indicating feature is disabled
- **Impact:** No AI-generated images for articles

### 3. Quote Card Generation (`FEATURE_QUOTE_CARD=false`)
- **Endpoint:** `/api/generate/quote-card`
- **Reason:** Depends on image generation (Ollama)
- **Response:** Returns structured JSON indicating feature is disabled
- **Impact:** No quote card images generated

## Active Core Features

These features remain **fully operational**:

✅ Content Generation (Twitter, LinkedIn, Reddit, etc.)  
✅ Blog Post Generation  
✅ Research Analysis (arXiv papers)  
✅ Hashtag Recommendations  
✅ Article Processing & Scoring  
✅ Daily Intelligence Summaries  
✅ Dashboard & Analytics  
✅ Scheduling & Automation  

## Feature Flag Configuration

Feature flags are controlled via environment variables in `.env`:

```bash
# Stability Mode - Feature Flags
FEATURE_AUDIO=false
FEATURE_IMAGE=false
FEATURE_QUOTE_CARD=false
```

To re-enable a feature (not recommended during stability period):
1. Set the flag to `true` in `.env`
2. Ensure external service is configured and working
3. Restart backend container: `docker-compose restart backend`

## API Response Format

When a disabled feature is called, the API returns:

```json
{
  "status": "disabled",
  "feature": "audio_generation",
  "message": "Audio generation is disabled in stability mode",
  "enabled": false
}
```

**HTTP Status:** 200 OK (not an error)

## System Health Monitoring

### New Endpoint: `/api/system/health`

Comprehensive health check including:
- Circuit breaker state
- LLM fallback statistics
- Feature flag status
- Disabled features list
- System vitals

**Example Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T10:00:00Z",
  "circuit_breaker": {
    "enabled": true,
    "failure_rate": 0.05,
    "threshold": 0.5
  },
  "fallback_statistics": {
    "total_processed_articles": 112,
    "fallback_count": 3,
    "fallback_rate_percent": 2.68
  },
  "feature_flags": {
    "audio_generation": false,
    "image_generation": false,
    "quote_card_generation": false,
    "content_generation": true,
    "blog_generation": true,
    "research_analysis": true,
    "hashtag_recommendations": true
  },
  "disabled_features": [
    "audio_generation",
    "image_generation",
    "quote_card_generation"
  ],
  "stability_mode": true,
  "vitals": { ... }
}
```

## Circuit Breaker & Fallback Tracking

### Circuit Breaker
- Monitors LLM failure rate
- Automatically switches to fallback when threshold exceeded
- State exposed via `/api/system/health`

### Fallback Statistics
- Tracked in database (`ProcessedArticle.llm_fallback` field)
- Fallback rate calculated and exposed in health endpoint
- No LLM calls are skipped silently - all failures logged

## Pipeline Independence

The core pipeline now operates **completely independently** of external media services:

1. **Article Fetching** → RSS, arXiv, Reddit, Gmail
2. **Processing** → Deduplication, cleaning, analysis
3. **Scoring** → Viral, technical, relevance scores
4. **Content Generation** → Social media posts (LLM-based)
5. **Blog Generation** → Long-form content (LLM-based)
6. **Scheduling** → Automated posting queue

**No media generation steps** are in the critical path.

## Deployment

### Rebuild Backend Container

```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Verify Stability Mode

```bash
# Check system health
curl http://localhost:5000/api/system/health | jq

# Test disabled feature (should return "disabled" status)
curl -X POST http://localhost:5000/api/generate/audio/1

# Test core feature (should work normally)
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"article_id": 1, "platform": "twitter"}'
```

## Monitoring Checklist

Daily monitoring tasks for single operator:

- [ ] Check `/api/system/health` for circuit breaker state
- [ ] Monitor fallback rate (should be < 5%)
- [ ] Verify core pipeline runs successfully
- [ ] Check dashboard stats for content generation
- [ ] Review logs for any errors (not warnings about disabled features)

## Troubleshooting

### "Feature disabled" messages in logs
**Status:** ✅ Normal  
**Action:** None required - this is expected behavior

### High fallback rate (> 10%)
**Status:** ⚠️ Warning  
**Action:** Check LLM service (Ollama) health, restart if needed

### Circuit breaker triggered
**Status:** ⚠️ Warning  
**Action:** Check `/api/system/health`, review recent LLM errors

### Core content generation failing
**Status:** ❌ Critical  
**Action:** Check database connectivity, LLM service, restart backend

## Success Metrics

Stability mode is successful when:

✅ System runs for 6 months without operator intervention  
✅ Fallback rate remains below 5%  
✅ Core content generation success rate > 95%  
✅ No external service dependencies cause failures  
✅ Circuit breaker prevents cascading failures  

## Rollback Plan

If stability mode needs to be exited:

1. Update `.env` to enable desired features
2. Configure external services (Edge TTS, Ollama)
3. Test each feature individually
4. Restart backend container
5. Monitor for 24 hours before declaring stable

## Notes

- **Do not attempt to fix external services** during stability period
- **Do not add new features** that depend on external services
- Focus on core functionality reliability
- Document any issues for future improvement
- Stability mode can be extended beyond 6 months if needed

---

**Last Updated:** March 1, 2026  
**Next Review:** September 1, 2026
