# LLM Caching Strategy

## Two-Tier Cache System

### Redis Cache (L1)
- Fast, ephemeral
- TTL: 30 minutes
- Lost on restart

### SQLite Cache (L2)
- Persistent, slower
- TTL: indefinite (manual expiration)
- Survives restarts

## Synchronization

1. **Cache Hit (Redis):** Return immediately
2. **Cache Miss (Redis):** Check SQLite before LLM call
3. **New Response:** Write to BOTH Redis + SQLite
4. **Consistency:** Both caches store identical content with same hash

## Guarantees

- Same prompt always returns same response (24h consistency)
- Best-effort consistency with fallback guarantees: if Redis expires, SQLite fallback works
- LLM only called if both caches miss

## Code Flow

```python
prompt_hash = hash_prompt(prompt, model)

# 1. Check Redis (fast)
redis_cache = redis.get(prompt_hash)
if redis_cache:
    return redis_cache  # Fast path

# 2. Check SQLite (fallback)
sqlite_cache = db.query(LLMCache).filter_by(prompt_hash=prompt_hash).first()
if sqlite_cache:
    # Populate Redis for next time
    redis.set(prompt_hash, sqlite_cache.response, ex=1800)
    return sqlite_cache.response

# 3. Call LLM (cache miss)
response = llm_client.generate(prompt)

# 4. Store in BOTH caches
redis.set(prompt_hash, response, ex=1800)  # 30 min
db.session.add(LLMCache(
    prompt_hash=prompt_hash,
    response=response,
    created_at=now()
))
db.commit()

return response
```

## Testing

Guarantee: Same prompt on day 2 returns exact same response

```python
def test_lllm_cache_consistency():
    prompt = "Analyze this paper:"
    
    # Day 1: Cold cache
    response1 = smart_router.generate(prompt, task=ANALYSIS)
    
    # Manually clear Redis
    redis.flushdb()
    
    # Day 2: Redis empty, SQLite hit
    response2 = smart_router.generate(prompt, task=ANALYSIS)
    
    assert response1 == response2, "Cache divergence detected!"
```
