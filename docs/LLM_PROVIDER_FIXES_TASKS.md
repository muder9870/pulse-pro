# LLM Provider Fixes - Comprehensive Task List

## Overview
This file lists the tasks to bring all LLM providers up to the same production-grade standard as Cerebras.

---

## Golden Rule
**Provider clients MUST NEVER**:
- Sleep (`time.sleep`)
- Retry internally
- Fallback internally
- Own orchestration behavior

**Provider clients SHOULD**:
- Fail fast
- Expose structured errors
- Expose Retry-After metadata

---

## Tasks to Complete (Prioritized)

### 0. Create Shared Provider Base Infrastructure (Highest Priority)
- [x] Add BaseLLMProvider abstraction class
- [x] Standardize provider exceptions (RateLimitError, ProviderError, RetryLaterError)
- [x] Standardize Retry-After header parsing
- [x] Standardize telemetry/logging
- [x] Standardize fail-fast behavior
- [x] Add shared Redis rate limiter utilities
- [x] Add shared inflight request limiter utilities

### 1. Fix Groq Client
- [x] Remove per-process sliding window rate limiting
- [x] Integrate with shared Redis rate limiter
- [x] Remove internal `time.sleep` calls; raise errors immediately
- [x] Add inflight request limiter
- [x] Honor Retry-After headers if present
- [x] Migrate to BaseLLMProvider

### 2. Fix Mistral Client
- [x] Remove internal retries with `time.sleep`
- [x] Raise errors immediately instead of sleeping
- [x] Honor Retry-After headers if present
- [x] Migrate to BaseLLMProvider

### 3. Fix OpenRouter Client
- [x] Remove internal retries with `time.sleep`
- [x] Raise errors immediately instead of sleeping
- [x] Honor Retry-After headers if present
- [x] Migrate to BaseLLMProvider

### 4. (Optional) Bring Other Providers Up to Standard
- [x] Gemini: Migrate to BaseLLMProvider
- [x] Pollinations Text: Migrate to BaseLLMProvider
- [x] Ollama (Local): Migrate to BaseLLMProvider (no rate limiting needed)

### 5. Add Deferred Retry Support
- [x] Support Celery countdown retries using Retry-After headers
- [x] Allow preferred provider retry before immediate fallback
- [x] Prevent retry storms during provider outages

### 6. Provider Health State Tracking
- [x] Add shared provider health states (HEALTHY, DEGRADED, RATE_LIMITED, OPEN, DISABLED)
- [x] Add cooldown windows
- [x] Skip providers in OPEN state
- [x] Track provider recovery automatically

### 7. Metrics & Observability
- [x] Provider success/failure counters (already implemented)
- [x] Rate limit counters (already implemented)
- [x] Fallback usage metrics (already implemented)
- [x] Queue wait time metrics (already implemented)
- [ ] Worker utilization metrics
- [x] p95/p99 latency tracking (already implemented)

---

## Goals
- **No more worker blocking (aka "worker hostage")**: All clients raise errors immediately
- **Global rate limiting**: Use Redis for rate limiting shared across all workers
- **Consistent error handling**: All providers follow the same pattern (raise errors → llm_router handles failover)
- **Retry-After header support**: Honor provider Retry-After headers when present
- **Shared abstractions**: Prevent duplicated code across providers
- **Centralized governance**: Orchestration (retries, fallbacks) lives in llm_router, not individual providers
- **Observability**: Permanent visibility into provider performance and health

---

## Refined Architecture
```
Provider Client → Thin Transport Layer
     ↓
Router → Retries, Fallbacks, Cooldowns, Load Balancing
     ↓
Queue Layer → Deferred Retries, Backpressure, Scheduling
```

---

## Notes
- Source branch: `feature/cerebras-rate-limiter-fixes`
- Current branch: `feature/llm-provider-base-infrastructure`
- Prioritize order: 0 → 1 → 2 → 3 → (4-7 as time permits)

