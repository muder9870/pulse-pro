# 🚨 CRITICAL ISSUE REMAINING: Celery Backend API

## Problem Identified

The Celery Redis backend `set()` method expects the following signature:
```python
set(key, value, retry_policy=None)
```

But our code is calling:
```python
celery_app.backend.set(idempotency_key, 'processing', expire=60)
```

The `expire` parameter should be set via the `retry_policy` parameter, not as a direct keyword argument.

## Root Cause

Looking at the Celery Redis backend source code, the `set()` method uses:
- `key` (positional)
- `value` (positional) 
- `retry_policy` (keyword) - contains expiration logic

The `expire` parameter is not a direct parameter but gets processed through the retry policy.

## Solution Options

### Option 1: Use expire() method directly
```python
# Set processing key
celery_app.backend.set(idempotency_key, 'processing')
celery_app.backend.expire(idempotency_key, 60)

# Set completion key
celery.app.backend.set(idempotency_key, 'completed')
celery_app.backend.expire(idempotency_key, 3600)
```

### Option 2: Use retry_policy parameter
```python
from celery.backends.redis import RetryPolicy

# Create retry policy with expiration
retry_policy = RetryPolicy(expires=60)
celery_app.backend.set(idempotency_key, 'processing', retry_policy=retry_policy)
```

### Option 3: Use direct Redis client (Recommended)
Since we already have Redis client connection, use it directly:
```python
import redis
redis_client = redis.Redis(host='redis', port=6379, db=0)

# Set processing key
redis_client.setex(idempotency_key, 60, 'processing')

# Set completion key  
redis_client.setex(idempotency_key, 3600, 'completed')
```

## Recommendation

**Use Option 3** - Direct Redis client because:
1. It's already imported and working
2. Clearer intent (SET with EXPIRE)
3. No Celery backend API complexity
4. More reliable and explicit

## Current Status

| Issue | Status | Impact |
|--------|---------|---------|
| Redis Connection | ✅ FIXED | Working in Docker |
| Transaction Boundaries | ✅ IMPLEMENTED | Atomic state transitions |
| Cost Limiting | ✅ IMPLEMENTED | Budget and storm protection |
| Celery Backend API | ❌ BROKEN | Idempotency completely broken |

**Overall Readiness:** 75% - One critical blocker remains

## Next Action

Replace Celery backend.set() calls with direct Redis client calls to complete all critical fixes.
