# Pre-Production Failure Simulation and Reliability Audit Tasks

**Date:** March 29, 2026  
**System Status:** Production-grade with idempotent pipeline, async architecture, and monitoring.  
**Audit Focus:** Hidden failure modes under extreme conditions.  
**Objective:** Implement fixes for identified weaknesses to achieve bulletproof reliability.

## Overview
This document outlines actionable tasks derived from the failure simulation audit. Each issue includes:
- **Checklist:** Step-by-step implementation items.
- **Code Changes:** Exact file modifications with before/after snippets.
- **Validation:** How to test the fix.

Tasks are grouped by category. Implement in order of priority: Recovery/Self-Healing first, then Consistency, then Performance/Cost.

---

## 1. Failure Simulation

### Task 1.1: DB Recovery Mode Handling
**Priority:** High  
**Issue:** DB recovery mode causes transaction failures during active processing.

**Checklist:**
- [ ] Add `get_db_health()` function to `backend/db/session.py`.
- [ ] Modify `process_article` task in `backend/tasks.py` to check DB health before execution.
- [ ] Update retry logic with exponential backoff.
- [ ] Test: Simulate DB recovery (e.g., via `pg_ctl stop -m immediate`) and verify tasks retry without crashing.

**Code Changes:**

1. **File:** `backend/db/session.py`  
   **Change:** Add health check function at the end of the file.  
   **Before:**
   ```python
   # Existing imports and engine setup
   ```
   **After:**
   ```python
   # Existing imports and engine setup

   def get_db_health():
       try:
           with engine.connect() as conn:
               conn.execute(text("SELECT 1"))
           return True
       except Exception:
           return False
   ```

2. **File:** `backend/tasks.py`  
   **Change:** Import `get_db_health` and add check in `process_article`.  
   **Before:**
   ```python
   from backend.db.session import SessionLocal
   # ... other imports ...

   @celery_app.task(bind=True, max_retries=5, default_retry_delay=60)
   def process_article(self, article_id, idempotency_key):
       # Existing logic
   ```
   **After:**
   ```python
   from backend.db.session import SessionLocal, get_db_health
   # ... other imports ...

   @celery_app.task(bind=True, max_retries=5, default_retry_delay=60)
   def process_article(self, article_id, idempotency_key):
       if not get_db_health():
           raise self.retry(countdown=2 ** self.request.retries)
       # Existing logic
   ```

### Task 1.2: Redis Persistence and Fallback - Completed
**Priority:** High  
**Issue:** Redis restart evicts keys, breaking idempotency and cache.

**Checklist:**
- [ ] Enable AOF and RDB in `docker-compose.yml` for Redis.
- [ ] Add DB fallback for idempotency in `backend/tasks.py`.
- [ ] Test: Restart Redis container and verify idempotency holds via DB.

**Code Changes:**

1. **File:** `docker-compose.yml`  
   **Change:** Update Redis service configuration.  
   **Before:**
   ```yaml
   redis:
     image: redis:7-alpine
   ```
   **After:**
   ```yaml
   redis:
     image: redis:7-alpine
     command: redis-server --appendonly yes --save 60 1000
     volumes:
       - redis_data:/data
   ```

2. **File:** `backend/tasks.py`  
   **Change:** Add `check_idempotency` with DB fallback.  
   **Before:**
   ```python
   # Existing imports
   def process_article(self, article_id, idempotency_key):
       # Existing logic
   ```
   **After:**
   ```python
   # Existing imports
   def check_idempotency(idempotency_key, article_id):
       redis_key = f"idempotency:{idempotency_key}"
       if redis_client.exists(redis_key):
           return True
       # Fallback to DB
       with SessionLocal() as session:
           existing = session.query(Article).filter_by(id=article_id, status='published').first()
           if existing:
               redis_client.setex(redis_key, 3600, "processed")
               return True
       return False

   def process_article(self, article_id, idempotency_key):
       if check_idempotency(idempotency_key, article_id):
           return
       # Existing logic
   ```

### Task 1.3: Worker Crash Handling (acks_late) - Completed
**Priority:** High  
**Issue:** Partial execution before crash leads to duplicates.

**Checklist:**
- [ ] Add atomic state lock in `backend/tasks.py`.
- [ ] Test: Kill worker mid-task and verify no duplicate processing.

**Code Changes:**

1. **File:** `backend/tasks.py`  
   **Change:** Wrap processing in transaction with lock.  
   **Before:**
   ```python
   def process_article(self, article_id, idempotency_key):
       # Existing logic
   ```
   **After:**
   ```python
   def process_article(self, article_id, idempotency_key):
       with SessionLocal() as session:
           article = session.query(Article).with_for_update().filter_by(id=article_id).first()
           if article.status in ['generated', 'published']:
               return  # Already processed
           # Process and commit atomically
           # ... existing processing logic ...
           session.commit()
   ```

### Task 1.4: Duplicate Message Deduplication - Completed
**Priority:** Medium  
**Issue:** Broker redelivers messages.

**Checklist:**
- [ ] Add `dedupe_message` function in `backend/tasks.py`.
- [ ] Call at task start.
- [ ] Test: Simulate network partition and verify no duplicates.

**Code Changes:**

1. **File:** `backend/tasks.py`  
   **Change:** Add deduplication logic.  
   **Before:**
   ```python
   def process_article(self, article_id, idempotency_key):
       # Existing logic
   ```
   **After:**
   ```python
   def dedupe_message(message_id):
       return redis_client.set(f"msg:{message_id}", "1", ex=3600, nx=True)

   def process_article(self, article_id, idempotency_key):
       if not dedupe_message(self.request.id):
           return
       # Existing logic
   ```

### Task 1.5: LLM Response Validation - Completed
**Priority:** Medium  
**Issue:** Malformed responses cause crashes.

**Checklist:**
- [ ] Add validation in `backend/llm/llm_router.py`.
- [ ] Test: Mock invalid LLM response and verify fallback.

**Code Changes:**

1. **File:** `backend/llm/llm_router.py`  
   **Change:** Validate response in `generate`.  
   **Before:**
   ```python
   def generate(prompt):
       response = call_provider(prompt)
       return response['content']
   ```
   **After:**
   ```python
   def generate(prompt):
       response = call_provider(prompt)
       if not response or 'content' not in response:
           raise ValueError("Invalid LLM response")
       return response['content']
   ```

### Task 1.6: Network Partition Circuit Breaker - Completed
**Priority:** Medium  
**Issue:** Partitions isolate components.

**Checklist:**
- [ ] Add `pybreaker` to `requirements.txt`.
- [ ] Implement circuit breaker in session and router.
- [ ] Test: Simulate partition (e.g., via iptables) and verify breaker opens.

**Code Changes:**

1. **File:** `requirements.txt`  
   **Change:** Add dependency.  
   **Before:**
   ```txt
   # Existing deps
   ```
   **After:**
   ```txt
   # Existing deps
   pybreaker==1.1.0
   ```

2. **File:** `backend/db/session.py`  
   **Change:** Add breaker to session.  
   **Before:**
   ```python
   def get_session():
       return SessionLocal()
   ```
   **After:**
   ```python
   from pybreaker import CircuitBreaker

   breaker = CircuitBreaker(fail_max=3, reset_timeout=60)

   @breaker
   def get_session():
       return SessionLocal()
   ```

3. **File:** `backend/llm/llm_router.py`  
   **Change:** Add breaker to LLM calls.  
   **Before:**
   ```python
   def generate(prompt):
       # Existing logic
   ```
   **After:**
   ```python
   from pybreaker import CircuitBreaker

   breaker = CircuitBreaker(fail_max=3, reset_timeout=60)

   @breaker
   def generate(prompt):
       # Existing logic
   ```

---

## 2. Consistency Guarantees

### Task 2.1: Exactly-Once via DB Idempotency - Completed
**Priority:** High  
**Issue:** Reliance on Redis leads to duplicates.

**Checklist:**
- [ ] Create `IdempotencyLog` model in `backend/models.py`.
- [ ] Implement DB-based check in `backend/tasks.py`.
- [ ] Test: Evict Redis keys and verify no duplicates.

**Code Changes:**

1. **File:** `backend/models.py`  
   **Change:** Add model.  
   **Before:**
   ```python
   # Existing models
   ```
   **After:**
   ```python
   # Existing models

   class IdempotencyLog(Base):
       __tablename__ = "idempotency_logs"
       id = Column(Integer, primary_key=True)
       key = Column(String, unique=True, nullable=False)
       article_id = Column(Integer, nullable=False)
       created_at = Column(DateTime, default=datetime.utcnow)
   ```

2. **File:** `backend/tasks.py`  
   **Change:** Add DB check.  
   **Before:**
   ```python
   def check_idempotency(idempotency_key, article_id):
       # Existing logic
   ```
   **After:**
   ```python
   def check_and_set_idempotency(idempotency_key, article_id):
       with SessionLocal() as session:
           existing = session.query(IdempotencyLog).filter_by(key=idempotency_key).first()
           if existing:
               return True
           session.add(IdempotencyLog(key=idempotency_key, article_id=article_id))
           session.commit()
       return False

   def process_article(self, article_id, idempotency_key):
       if check_and_set_idempotency(idempotency_key, article_id):
           return
       # Existing logic
   ```

---

## 3. Data Integrity Risks

### Task 3.1: Atomic State Transitions - Completed
**Priority:** High  
**Issue:** Partial transitions leave inconsistent state.

**Checklist:**
- [ ] Batch updates in single transaction in `backend/tasks.py`.
- [ ] Test: Crash mid-task and verify state consistency.

**Code Changes:**

1. **File:** `backend/tasks.py`  
   **Change:** Atomic updates.  
   **Before:**
   ```python
   # Processing logic
   ```
   **After:**
   ```python
   with SessionLocal() as session:
       article.status = 'generated'
       article.content = generated_content
       session.commit()  # Atomic update
   ```

### Task 3.2: Transaction-Bound Side-Effects - Completed
**Priority:** Medium  
**Issue:** External calls outside transactions.

**Checklist:**
- [ ] Move LLM/cache inside transaction in `backend/processors/analyzer.py`.
- [ ] Test: Simulate rollback and verify no side-effects.

**Code Changes:**

1. **File:** `backend/processors/analyzer.py`  
   **Change:** Wrap in transaction.  
   **Before:**
   ```python
   # DB updates
   # LLM call
   ```
   **After:**
   ```python
   with session.begin():
       # DB updates
       # LLM call and cache only if commit succeeds
       cache.set(key, response)
   ```

---

## 4. Performance Under Load

### Task 4.1: Queue Backlog Mitigation - Completed
**Priority:** Medium  
**Issue:** High load causes redelivery.

**Checklist:**
- [ ] Increase `visibility_timeout` in `backend/celery_app.py`.
- [ ] Add rate limiting.
- [ ] Test: Flood queue and verify no storms.

**Code Changes:**

1. **File:** `backend/celery_app.py`  
   **Change:** Update config.  
   **Before:**
   ```python
   celery_app.conf.update(
       task_acks_late=True,
       worker_prefetch_multiplier=1,
       visibility_timeout=3600,
   )
   ```
   **After:**
   ```python
   celery_app.conf.update(
       task_acks_late=True,
       worker_prefetch_multiplier=1,
       visibility_timeout=7200,
       task_default_rate_limit='10/m',
   )
   ```

### Task 4.2: DB Pool Expansion - Completed
**Priority:** Medium  
**Issue:** Pool exhaustion under concurrency.

**Checklist:**
- [ ] Increase pool size in `backend/db/session.py`.
- [ ] Test: High concurrency load and verify no exhaustion.

**Code Changes:**

1. **File:** `backend/db/session.py`  
   **Change:** Update engine.  
   **Before:**
   ```python
   engine = create_engine(url, pool_size=5, max_overflow=10, pool_pre_ping=True)
   ```
   **After:**
   ```python
   engine = create_engine(url, pool_size=20, max_overflow=30, pool_pre_ping=True)
   ```

### Task 4.3: Redis Memory Management - Completed
**Priority:** Medium  
**Issue:** Eviction under pressure.

**Checklist:**
- [ ] Add LRU policy in `docker-compose.yml`.
- [ ] Test: Fill Redis and verify eviction.

**Code Changes:**

1. **File:** `docker-compose.yml`  
   **Change:** Update Redis.  
   **Before:**
   ```yaml
   redis:
     command: redis-server --appendonly yes --save 60 1000
   ```
   **After:**
   ```yaml
   redis:
     command: redis-server --appendonly yes --save 60 1000 --maxmemory 512mb --maxmemory-policy allkeys-lru
   ```

---

## 5. Cost & Efficiency Risks

### Task 5.1: LLM Call Deduplication - Completed
**Priority:** High  
**Issue:** Retries cause duplicates.

**Checklist:**
- [ ] Cache per prompt hash in `backend/llm/llm_router.py`.
- [ ] Test: Force retries and verify cache hits.

**Code Changes:**

1. **File:** `backend/llm/llm_router.py`  
   **Change:** Add caching.  
   **Before:**
   ```python
   def generate(prompt):
       response = call_provider(prompt)
       return response['content']
   ```
   **After:**
   ```python
   import hashlib

   def generate(prompt):
       cache_key = hashlib.md5(prompt.encode()).hexdigest()
       if redis_client.exists(cache_key):
           return redis_client.get(cache_key)
       response = call_provider(prompt)
       redis_client.setex(cache_key, 86400, response['content'])
       return response['content']
   ```

### Task 5.2: Adaptive TTL - Completed
**Priority:** Low  
**Issue:** Fixed TTL inefficient.

**Checklist:**
- [ ] Implement adaptive TTL in `backend/llm/llm_router.py`.
- [ ] Test: Monitor cache usage and TTL adjustments.

**Code Changes:**

1. **File:** `backend/llm/llm_router.py`  
   **Change:** Add access tracking.  
   **Before:**
   ```python
   redis_client.setex(cache_key, 86400, response)
   ```
   **After:**
   ```python
   access_count = redis_client.incr(f"access:{cache_key}")
   ttl = 3600 * (1 + access_count)
   redis_client.setex(cache_key, ttl, response)
   ```

---

## 6. Recovery & Self-Healing

### Task 6.1: Reconciliation Job - Completed
**Priority:** High  
**Issue:** Stuck tasks after crash.

**Checklist:**
- [ ] Add `reconcile_stuck_tasks` in `backend/tasks.py`.
- [ ] Schedule via Celery Beat.
- [ ] Test: Simulate stuck tasks and verify recovery.

**Code Changes:**

1. **File:** `backend/tasks.py`  
   **Change:** Add reconciliation.  
   **Before:**
   ```python
   # Existing tasks
   ```
   **After:**
   ```python
   from datetime import datetime, timedelta

   @celery_app.task
   def reconcile_stuck_tasks():
       with SessionLocal() as session:
           stuck = session.query(Article).filter(Article.updated_at < datetime.utcnow() - timedelta(hours=1), Article.status='analyzing').all()
           for article in stuck:
               process_article.delay(article.id, generate_idempotency_key())
   ```

### Task 6.2: Startup Health Checks - Completed
**Priority:** Medium  
**Issue:** Unhealthy services on restart.

**Checklist:**
- [ ] Add checks in `backend/main.py`.
- [ ] Test: Start with unhealthy DB/Redis and verify failure.

**Code Changes:**

1. **File:** `backend/main.py`  
   **Change:** Add startup event.  
   **Before:**
   ```python
   # App setup
   ```
   **After:**
   ```python
   from backend.db.session import get_db_health

   @app.on_startup
   async def check_services():
       if not get_db_health() or not redis_client.ping():
           raise RuntimeError("Services unhealthy")
   ```

---

## Additional Critical Fixes

### 1. Add Runtime DB Health Guard (CRITICAL) - Completed

**File:** `backend/tasks.py`

**Code Change:**

```python
from backend.db.session import get_db_health

@celery_app.task(bind=True, max_retries=5)
def process_article(self, article_id, idempotency_key):

    # ADD THIS AT VERY START
    if not get_db_health():
        raise self.retry(countdown=2 ** self.request.retries)

    # continue existing logic
```

### 2. Fix Startup Crash Loop (MANDATORY) - Completed

**File:** `backend/main.py`

**Replace:**

```python
@app.on_startup
async def check_services():
    if not get_db_health() or not redis_client.ping():
        raise RuntimeError("Services unhealthy")
```

**With:**

```python
@app.on_startup
async def check_services():
    import asyncio

    for attempt in range(5):
        try:
            if get_db_health() and redis_client.ping():
                return
        except Exception:
            pass

        await asyncio.sleep(2 ** attempt)

    raise RuntimeError("Services unhealthy after retries")
```

### 3. Fix Redis Cache Decode (BUG) - Completed

**File:** `backend/llm/llm_router.py`

**Update:**

```python
cached = redis_client.get(cache_key)
if cached:
    return cached.decode()
```

### 4. Prevent TTL Memory Explosion - Completed

**File:** `backend/llm/llm_router.py`

**Update:**

```python
ttl = min(86400, 3600 * (1 + access_count))
```

### 5. Enforce Idempotency in Reconciliation (CRITICAL) - Completed

**File:** `backend/tasks.py`

**Update reconciliation logic:**

```python
for article in stuck:
    idempotency_key = generate_idempotency_key(article.id)

    if check_and_set_idempotency(idempotency_key, article.id):
        continue

    process_article.delay(article.id, idempotency_key)
```

### 6. REMOVE Row Locks (IMPORTANT) - Completed

**File:** `backend/tasks.py`

**DELETE ALL:**

```python
.with_for_update()
```

**Use:**

* UPSERT
* DB idempotency only

### 7. Add DB Index for Idempotency - Completed

**File:** migration or models

```sql
CREATE INDEX idx_idempotency_created_at 
ON idempotency_logs(created_at);
```

---

## Validation and Rollout
- **Testing:** Use unit tests for each fix; integration tests for end-to-end scenarios (e.g., chaos engineering with network partitions).
- **Monitoring:** Verify Prometheus metrics reflect improvements (e.g., reduced retry counters).
- **Rollback:** Keep backups of modified files.
- **Completion Criteria:** All checklists checked; system survives simulated failures without data loss or duplicates.