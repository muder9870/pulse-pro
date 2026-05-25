# SRE Blocker-Fix Patch — Corrected Approach

**Post-Approval Reality Audit · March 29, 2026 · Principal SRE**

---

## Document Purpose

This document identifies every flaw in the originally proposed SRE blocker-fix patch, provides the corrected implementation for each component, and defines the validation criteria that must pass before the system is considered production-safe.

---

## Task Summary — All Blockers

| # | Task | File | Priority | Validation Check |
|---|------|------|----------|-----------------|
| 1 | Reconciliation job — add batching, metrics, error handling | `backend/tasks.py` | 🔴 BLOCKER | `reconciliation.reconciled > 0` per run |
| 2 | Cleanup job — add audit trail and metrics | `backend/tasks.py` | 🔴 BLOCKER | `cleanup.articles_failed` metric emitted |
| 3 | State consistency monitor — fix broken key comparison | `backend/tasks.py` | 🔴 BLOCKER | `consistency.mismatches` metric < 10 |
| 4 | Performance health check — add Redis, HTTP 503 on degraded | `backend/main.py` | 🟠 HIGH | 503 returned when Redis down |
| 5 | Cost monitoring — add token, retry, latency metrics | `backend/monitoring/metrics.py` | 🟠 HIGH | `llm_retries_total / llm_calls_total` alert fires |
| 6 | Redis memory limit — verify 512mb fits data volume | `docker-compose.yml` | 🟡 MEDIUM | No OOM eviction under normal load |
| 7 | Runbook — add verification steps and escalation paths | `RUNBOOK.md` | 🟠 HIGH | Each incident type has a Verify step |
| 8 | *(Enhancement)* Reconciliation — replace OFFSET with cursor-based pagination | `backend/tasks.py` | 🟠 HIGH | No skipped rows on large datasets |
| 9 | *(Enhancement)* Redis key format — centralise into builder function | `backend/tasks.py` | 🟠 HIGH | Key format change requires one-line edit |
| 10 | *(Enhancement)* Cleanup job — introduce `timeout_failed` + `retry_allowed` | `backend/tasks.py` | 🟡 MEDIUM | Recoverable articles not permanently failed |
| 11 | *(Enhancement)* Redis eviction monitoring — add metric + alert | `docker-compose.yml` / alerts | 🟡 MEDIUM | Alert fires before silent cache eviction |
| 12 | *(Enhancement)* Reconciliation — add enqueue flood cap (`MAX_ENQUEUE`) | `backend/tasks.py` | 🟠 HIGH | Queue depth stable under large backlog |

---

## Original Proposal — Verdict per Component

| Component | Verdict | Key Issue Found / Fix Applied |
|-----------|---------|-------------------------------|
| Reconciliation job | ⚠️ CORRECTED | No metrics emitted → still shows 0% in monitoring. No batching → 3,820 rows loaded into memory at once (OOM risk). No per-article error handling → single failure aborts entire run. |
| Cleanup job | ⚠️ CORRECTED | Logic correct but no `failed_reason` column written and no metric emitted. No forensic trail if articles wrongly failed. |
| State consistency monitor | ❌ WRONG | Compares `published` DB count against `idempotency:*` Redis keys — completely unrelated domains. Will fire constant false alerts or miss real drift entirely. |
| Performance health check | ⚠️ CORRECTED | Only checks DB; Redis and queue depth ignored. Returns 200 even when degraded — load balancers cannot act on it. |
| Cost monitoring | ⚠️ CORRECTED | Raw call counter only. Cannot detect retry storms or 6x cost multiplier. No token or latency tracking. |
| Redis memory limit | ✅ FIXED | `allkeys-lru` is correct. 512mb may need verification against actual key volume. |
| Runbook | ⚠️ CORRECTED | No verification steps after each action. No escalation criteria. Unsafe for production incidents. |

---

## Fix 1 — Reconciliation Job

**File: `backend/tasks.py`**

> **What was wrong**
> 1. No metrics — still shows 0% effectiveness in monitoring.
> 2. No batching — 3,820 articles loaded into memory at once (OOM risk).
> 3. No per-article error handling — one DB timeout aborts the entire run.
> 4. No logging — impossible to prove the job actually ran.

### Corrected Implementation

```python
@celery_app.task(bind=True, max_retries=3)
def reconcile_stuck_tasks(self):
    from datetime import datetime, timedelta

    logger.info("reconcile_stuck_tasks: starting run")
    reconciled = 0
    skipped    = 0
    errors     = 0
    batch_size = 100
    offset     = 0

    try:
        while True:
            with SessionLocal() as session:
                stuck = (
                    session.query(Article)
                    .filter(
                        Article.status.in_(["analyzing", "pending"]),
                        Article.updated_at < datetime.utcnow() - timedelta(minutes=30)
                    )
                    .order_by(Article.id)
                    .limit(batch_size)
                    .offset(offset)
                    .all()
                )

                if not stuck:
                    break

                for article in stuck:
                    try:
                        idempotency_key = generate_idempotency_key(article.id)
                        if check_and_set_idempotency(idempotency_key, article.id):
                            skipped += 1
                            continue
                        process_article.delay(article.id, idempotency_key)
                        reconciled += 1
                    except Exception as e:
                        logger.error(f"reconcile failed for article {article.id}: {e}")
                        errors += 1

                offset += batch_size

    except Exception as e:
        logger.error(f"reconcile_stuck_tasks: fatal — {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        # Always emit — proves job ran even if zero articles found
        metrics.gauge("reconciliation.reconciled", reconciled)
        metrics.gauge("reconciliation.skipped",    skipped)
        metrics.gauge("reconciliation.errors",     errors)
        logger.info(
            f"reconcile_stuck_tasks: done — "
            f"reconciled={reconciled} skipped={skipped} errors={errors}"
        )
```

> **Validation:** Trigger `reconcile_stuck_tasks.delay()` manually. Confirm `reconciliation.reconciled > 0` in metrics and `done` log line appears. Stuck article count in DB should fall within one run cycle.

---

### Enhancement 1 — Cursor-Based Pagination (Scalability Fix)

> **Enhancement — replaces OFFSET pagination in the implementation above**
>
> `OFFSET`-based pagination has two production failure modes on large datasets: query time grows linearly as offset increases (slow on 3,820+ rows), and rows inserted or deleted mid-run cause skips or duplicates. Replace with cursor-based pagination using `last_id`.

**Replace the `offset = 0` / `.offset(offset)` / `offset += batch_size` pattern above with:**

```python
@celery_app.task(bind=True, max_retries=3)
def reconcile_stuck_tasks(self):
    from datetime import datetime, timedelta

    logger.info("reconcile_stuck_tasks: starting run")
    reconciled = 0
    skipped    = 0
    errors     = 0
    batch_size = 100
    last_id    = 0                          # cursor — stable across data changes
    cutoff     = datetime.utcnow() - timedelta(minutes=30)

    MAX_ENQUEUE = 1000                      # flood protection — see Enhancement 5

    try:
        while True:
            with SessionLocal() as session:
                batch = (
                    session.query(Article)
                    .filter(
                        Article.id > last_id,               # cursor, not OFFSET
                        Article.status.in_(["analyzing", "pending"]),
                        Article.updated_at < cutoff
                    )
                    .order_by(Article.id)
                    .limit(batch_size)
                    .all()
                )

                if not batch:
                    break

                for article in batch:
                    last_id = article.id    # advance cursor on every row

                    if reconciled >= MAX_ENQUEUE:
                        logger.warning(
                            f"reconcile_stuck_tasks: enqueue cap {MAX_ENQUEUE} reached — "
                            f"remaining rows deferred to next run"
                        )
                        break

                    try:
                        idempotency_key = generate_idempotency_key(article.id)
                        if check_and_set_idempotency(idempotency_key, article.id):
                            skipped += 1
                            continue
                        process_article.delay(article.id, idempotency_key)
                        reconciled += 1
                    except Exception as e:
                        logger.error(f"reconcile failed for article {article.id}: {e}")
                        errors += 1

                else:
                    continue   # inner loop completed normally — fetch next batch
                break          # inner loop hit MAX_ENQUEUE — stop outer loop too

    except Exception as e:
        logger.error(f"reconcile_stuck_tasks: fatal — {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        metrics.gauge("reconciliation.reconciled", reconciled)
        metrics.gauge("reconciliation.skipped",    skipped)
        metrics.gauge("reconciliation.errors",     errors)
        logger.info(
            f"reconcile_stuck_tasks: done — "
            f"reconciled={reconciled} skipped={skipped} errors={errors}"
        )
```

> **Why this is safe:** `Article.id > last_id` with `ORDER BY id` is index-anchored — query cost is O(log n) regardless of how far into the table you are, and no row is skipped if new rows are inserted mid-run.

> **Validation:** Run reconciliation against a table with 5,000+ stuck rows. Confirm `reconciliation.reconciled` reaches expected count with no gaps. Check DB slow-query log — no query should exceed 100ms even on page 50+.

---

### Enhancement 5 — Reconciliation Queue Flood Protection

> **Enhancement — integrated into the cursor-based implementation above**
>
> Without a cap, reconciliation enqueues every stuck article in a single run. On a backlog of 3,820+ articles, this floods the Celery queue instantly, causes worker memory spikes, and can starve other in-flight tasks. The `MAX_ENQUEUE = 1000` cap in the implementation above limits enqueues per run; remaining articles are picked up on the next scheduled execution.

The relevant lines in the implementation above:

```python
MAX_ENQUEUE = 1000

if reconciled >= MAX_ENQUEUE:
    logger.warning(
        f"reconcile_stuck_tasks: enqueue cap {MAX_ENQUEUE} reached — "
        f"remaining rows deferred to next run"
    )
    break
```

**Tune `MAX_ENQUEUE` based on your worker capacity:**

| Workers | Recommended MAX_ENQUEUE |
|---------|------------------------|
| 2–4     | 200–500                |
| 5–10    | 500–1,000              |
| 10+     | 1,000–2,000            |

> **Validation:** Trigger reconciliation with 2,000+ stuck articles. Confirm `reconciliation.reconciled` metric stops at 1,000 and log shows the cap warning. Confirm Celery queue depth does not spike above `MAX_ENQUEUE` + existing queue size. Second run should pick up the remaining articles.

---

## Fix 2 — Stuck Article Cleanup Job

**File: `backend/tasks.py`**

> **What was wrong:** Logic is directionally correct but: no `failed_reason` written (no forensic trail), no metric emitted (cannot alert on runaway cleanup), no logging of which IDs were failed.

### Corrected Implementation

```python
@celery_app.task
def cleanup_stuck_articles():
    from datetime import datetime, timedelta

    cutoff     = datetime.utcnow() - timedelta(hours=6)
    failed_ids = []

    with SessionLocal() as session:
        stuck = session.query(Article).filter(
            Article.status.in_(["analyzing", "pending"]),
            Article.updated_at < cutoff
        ).all()

        for article in stuck:
            article.status        = "failed"
            article.failed_reason = "cleanup_job_timeout"  # requires column
            failed_ids.append(article.id)

        session.commit()

    # Log first 20 IDs for forensic audit trail
    logger.warning(
        f"cleanup_stuck_articles: failed {len(failed_ids)} articles "
        f"— sample ids={failed_ids[:20]}"
    )
    metrics.gauge("cleanup.articles_failed", len(failed_ids))
```

If the `failed_reason` column does not exist yet, add it via migration:

```python
# Alembic migration
op.add_column("articles",
    sa.Column("failed_reason", sa.String(255), nullable=True)
)
```

> **Validation:** Confirm `cleanup.articles_failed` metric is emitted each run. Check logs for the `sample ids` warning line. Query `SELECT id, failed_reason FROM articles WHERE status='failed'` — `failed_reason` must not be NULL.

---

### Enhancement 2 — Safer Failure State (Irreversible State Risk Fix)

> **Enhancement — adds recoverability to the cleanup job above**
>
> Setting `status = "failed"` is a terminal, irreversible state. If a task timed out due to a transient issue (slow LLM provider, temporary DB lag), permanently failing it discards recoverable work. Introduce `timeout_failed` as a distinct status and a `retry_allowed` flag so operators can selectively requeue without ambiguity.

**Replace the status assignment in the corrected cleanup job with:**

```python
for article in stuck:
    article.status        = "timeout_failed"   # distinct from permanent "failed"
    article.retry_allowed = True               # operator can requeue if cause was transient
    article.failed_reason = "cleanup_job_timeout"
    failed_ids.append(article.id)
```

**Required migration additions:**

```python
# Alembic migration — add retry_allowed column and timeout_failed as valid status
op.add_column("articles",
    sa.Column("retry_allowed", sa.Boolean, nullable=True, default=False)
)
# If status is an ENUM type, extend it:
op.execute("ALTER TYPE article_status ADD VALUE IF NOT EXISTS 'timeout_failed'")
```

**Explicit decision record — choose one and document it in code:**

| Option | When to use | Trade-off |
|--------|-------------|-----------|
| `status = "timeout_failed"` + `retry_allowed = True` | Default — transient timeouts expected | Requires operator action to requeue; avoids silent re-processing |
| `status = "failed"` (terminal) | When timeout = unrecoverable by design | Simpler but loses recoverable work permanently |

> ⚠️ **Do not silently re-enqueue on cleanup.** Auto-requeuing from the cleanup job risks infinite retry loops. Requeue must be a deliberate operator action via `reconcile_stuck_tasks`.

> **Validation:** After cleanup run, query `SELECT COUNT(*) FROM articles WHERE status = 'timeout_failed' AND retry_allowed = TRUE`. Count must match `cleanup.articles_failed` metric. Confirm no article with `retry_allowed = FALSE` was set by this job.

---

## Fix 3 — State Consistency Monitor ⚠️ CRITICAL CORRECTION

**File: `backend/tasks.py`**

> **What was wrong — this is a bug, not a gap**
>
> The original code compares `published` article count in DB against `idempotency:*` keys in Redis. These are completely unrelated domains. Idempotency keys are ephemeral processing guards; published count is business state. This check will fire constant false alerts or silently miss real drift. It must be rewritten to compare the same key namespace in both systems.

### Original (broken) — DO NOT USE

```python
# WRONG — apples vs oranges comparison
db_count   = session.query(Article).filter_by(status="published").count()
redis_keys = redis_client.keys("idempotency:*")   # ← completely unrelated

if abs(db_count - len(redis_keys)) > 100:
    logger.error("State mismatch detected between DB and Redis")
```

### Corrected Implementation

```python
@celery_app.task
def check_state_consistency():
    """
    Spot-check a sample of terminal DB records against their Redis
    cache entries. Compares the SAME key namespace in both systems.
    Idempotency keys are NOT article state — never compare them.
    """
    mismatches = 0
    checked    = 0
    missing    = 0

    with SessionLocal() as session:
        # Sample recent terminal records — not a full table scan
        recent = (
            session.query(Article)
            .filter(Article.status.in_(["published", "failed", "processed"]))
            .order_by(Article.updated_at.desc())
            .limit(500)
            .all()
        )

        for article in recent:
            # Must match the key written by your actual write path
            redis_key = f"article:status:{article.id}"
            redis_val = redis_client.get(redis_key)
            checked  += 1

            if redis_val is None:
                # Acceptable if TTL expired — track but don't alert
                missing += 1
                continue

            if redis_val.decode() != article.status:
                logger.error(
                    f"state mismatch: article {article.id} "
                    f"db={article.status} redis={redis_val.decode()}"
                )
                mismatches += 1

    metrics.gauge("consistency.checked",    checked)
    metrics.gauge("consistency.missing",    missing)
    metrics.gauge("consistency.mismatches", mismatches)

    if mismatches > 10:
        alert(
            "DB/Redis state mismatch exceeds threshold",
            mismatches=mismatches
        )
```

> ⚠️ **Critical prerequisite:** Confirm your write path uses the key format `article:status:{id}`. If your actual key format differs, update `redis_key` in this function to match. A wrong key format will silently show 0 mismatches even when drift exists.

> **Validation:** `consistency.checked` should equal the sample size (up to 500). `consistency.mismatches` should be 0 on a clean system. Inject a deliberate mismatch in staging and confirm the alert fires.

---

### Enhancement 3 — Centralised Redis Key Builder (Key Safety Fix)

> **Enhancement — hardens Fix 3 against silent breakage from key format drift**
>
> The consistency monitor currently hardcodes `f"article:status:{article.id}"` inline. If the write path is updated to use a different format (e.g. adding a namespace prefix or switching to a hash key), the monitor silently compares against the wrong keys — always returning 0 mismatches even when genuine drift exists. Centralise the key format into a single builder function used everywhere.

**Add to `backend/redis_keys.py` (new file):**

```python
# backend/redis_keys.py
# Single source of truth for all Redis key formats.
# Import this function everywhere a Redis key for article state is constructed.

def get_article_status_key(article_id: int) -> str:
    """
    Returns the canonical Redis key for an article's current status.
    Change this function to update the key format system-wide.
    """
    return f"article:status:{article_id}"
```

**Update write path — wherever article status is written to Redis:**

```python
from backend.redis_keys import get_article_status_key

redis_client.setex(
    get_article_status_key(article.id),
    3600,
    article.status
)
```

**Update consistency monitor — replace inline key construction:**

```python
from backend.redis_keys import get_article_status_key

# Replace:  redis_key = f"article:status:{article.id}"
# With:
redis_key = get_article_status_key(article.id)
```

> **Validation:** Change the format string inside `get_article_status_key` (e.g. add a `v2:` prefix). Re-run write path + consistency monitor in staging. Confirm both use the new format without any other code changes. Revert before deploying.

---

## Fix 4 — Performance Health Check

**File: `backend/main.py`**

> **What was wrong:** Only checks DB latency. Redis and queue depth are ignored — system returns 200 even when Redis is completely down. Returns JSON body with 200 status on degraded state, meaning load balancers and uptime monitors cannot act on it. Must return HTTP 503 when degraded.

### Corrected Implementation

```python
from fastapi.responses import JSONResponse

@app.get("/health/performance")
async def performance_health():
    import time
    results  = {}
    degraded = False

    # 1. DB latency
    start = time.time()
    db_ok = get_db_health()
    db_latency = round(time.time() - start, 3)
    results["db"] = {"ok": db_ok, "latency_s": db_latency}
    if not db_ok or db_latency > 1.0:
        degraded = True

    # 2. Redis latency
    start = time.time()
    try:
        redis_client.ping()
        redis_ok = True
    except Exception:
        redis_ok = False
    redis_latency = round(time.time() - start, 3)
    results["redis"] = {"ok": redis_ok, "latency_s": redis_latency}
    if not redis_ok or redis_latency > 0.1:
        degraded = True

    # 3. Celery queue reachability
    try:
        celery_app.control.inspect(timeout=1).ping()
        results["queue"] = {"ok": True}
    except Exception:
        results["queue"] = {"ok": False}
        degraded = True

    # HTTP 503 lets load balancers and uptime monitors act automatically
    status_code = 503 if degraded else 200
    return JSONResponse(
        status_code=status_code,
        content={"status": "degraded" if degraded else "healthy", **results},
    )
```

> **Validation:** Stop Redis container. Hit `/health/performance` — must return HTTP 503 with `redis.ok: false`. Restart Redis — endpoint must return 200 within one poll cycle. Confirm your load balancer is configured to check `/health/performance`, not `/health`.

---

## Fix 5 — Cost Monitoring

**File: `backend/monitoring/metrics.py`**

> **What was wrong:** A raw call counter cannot detect a 6x cost blowout from retry storms. You need retry count tracked separately from primary calls, plus token consumption and latency. Without these, the metric shows "LLM calls happening" but not "costs are exploding".

### Corrected metrics.py

```python
from prometheus_client import Counter, Histogram

llm_calls_total  = Counter(
    "llm_calls_total", "Total LLM calls",
    ["model", "call_type"]   # call_type: primary | retry
)
llm_tokens_total = Counter(
    "llm_tokens_total", "Total tokens consumed", ["model"]
)
llm_latency      = Histogram(
    "llm_latency_seconds", "LLM call latency", ["model"]
)
llm_retries_total = Counter(
    "llm_retries_total", "LLM retry attempts", ["model"]
)

def track_llm_call(
    model: str,
    tokens: int,
    latency: float,
    is_retry: bool = False,
    call_type: str = "primary"
):
    llm_calls_total.labels(model=model, call_type=call_type).inc()
    llm_tokens_total.labels(model=model).inc(tokens)
    llm_latency.labels(model=model).observe(latency)
    if is_retry:
        llm_retries_total.labels(model=model).inc()
```

### Call site in LLM Router

```python
import time
from monitoring.metrics import track_llm_call

start    = time.time()
response = llm_client.call(prompt, model=model)
latency  = time.time() - start

track_llm_call(
    model     = model,
    tokens    = response.usage.total_tokens,
    latency   = latency,
    is_retry  = attempt_number > 0,
    call_type = "retry" if attempt_number > 0 else "primary",
)
```

### Alert rule (Prometheus / Grafana)

```yaml
# Fire if retry rate exceeds 30% over 5 minutes — indicates cost blowout
- alert: LLMRetryStorm
  expr: |
    rate(llm_retries_total[5m])
    /
    rate(llm_calls_total{call_type="primary"}[5m]) > 0.3
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "LLM retry rate exceeds 30% — potential 6x cost multiplier active"
```

> **Validation:** Force a retry scenario in staging. Confirm `llm_retries_total` increments and the `LLMRetryStorm` alert fires within 5 minutes. Check Grafana: `llm_tokens_total` should grow proportionally to `llm_calls_total`.

---

## Fix 6 — Redis Memory Limit

**File: `docker-compose.yml`**

> ✅ **Status: CORRECT — one verification required.** `allkeys-lru` is the right eviction policy for a cache. 512mb is the right shape of solution. Must verify 512mb is sized correctly for actual key volume before production.

```yaml
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
  ports:
    - "6379:6379"
```

### Verify your key volume fits in 512mb

```bash
# Check actual memory usage
redis-cli info memory | grep used_memory_human

# List largest key patterns
redis-cli --bigkeys

# Sample key size for article:status:* pattern
redis-cli debug object article:status:1
```

> ⚠️ **If 512mb is too small:** Increase to 1gb or 2gb, or add a TTL to `article:status:*` keys so they naturally expire. Excessive eviction under normal load will cause cache misses that spike DB query load — monitor the `evicted_keys` metric in `redis-cli info stats`.

---

### Enhancement 4 — Redis Eviction Monitoring (Runtime Memory Gap Fix)

> **Enhancement — adds runtime observability to Fix 6**
>
> The memory limit is now configured, but there is no alert if Redis begins evicting keys under load. Silent eviction means the consistency monitor will report `missing` keys as normal TTL expiry rather than a memory pressure signal. Add an explicit metric scrape and alert.

**Add to `backend/monitoring/metrics.py`:**

```python
from prometheus_client import Gauge

redis_evicted_keys = Gauge(
    "redis_evicted_keys_total",
    "Cumulative number of keys evicted by Redis due to maxmemory policy"
)
redis_used_memory_bytes = Gauge(
    "redis_used_memory_bytes",
    "Current Redis memory usage in bytes"
)

def scrape_redis_memory_metrics(redis_client):
    """Call this on a schedule (e.g. every 30s via a Celery beat task)."""
    info = redis_client.info("stats")
    redis_evicted_keys.set(info.get("evicted_keys", 0))

    mem_info = redis_client.info("memory")
    redis_used_memory_bytes.set(mem_info.get("used_memory", 0))
```

**Add a Celery beat task to scrape on schedule:**

```python
# In your Celery beat schedule config
"scrape-redis-metrics": {
    "task":     "tasks.scrape_redis_metrics",
    "schedule": 30.0,   # every 30 seconds
},
```

```python
@celery_app.task
def scrape_redis_metrics():
    from monitoring.metrics import scrape_redis_memory_metrics
    scrape_redis_memory_metrics(redis_client)
```

**Alert rule (Prometheus / Grafana):**

```yaml
- alert: RedisEvictionActive
  expr: increase(redis_evicted_keys_total[5m]) > 0
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis is actively evicting keys — cache misses will spike DB load"
    description: "Increase maxmemory or add TTLs to article:status:* keys"

- alert: RedisMemoryPressure
  expr: redis_used_memory_bytes / (512 * 1024 * 1024) > 0.85
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Redis memory usage above 85% of 512mb limit — eviction imminent"
```

> **Validation:** Temporarily set `maxmemory 1mb` in Redis config and write several keys. Confirm `RedisEvictionActive` alert fires within 5 minutes. Restore correct limit. Confirm `redis_used_memory_bytes` metric is visible in Grafana on 30s intervals.

---

## Fix 7 — Emergency Runbook

**File: `RUNBOOK.md`**

> **What was wrong:** No verification steps after any action. No escalation criteria or time thresholds. No expected side-effects documented. A runbook that says "restart the container" with no verify step is unsafe — operators have no signal that the action worked.

```markdown
# Emergency Runbook — Pulse Pro
Updated: 2026-03-29  |  Owner: Principal SRE

---

## DB Down

**Detect:** `GET /health/performance` returns `db.ok: false`
**Expected side-effect:** Redis still serves cached reads; LLM jobs will queue

1. `docker logs postgres --tail 100`
2. `docker restart postgres`
3. Wait 30s. Re-check `/health/performance`
4. If still down after 2 restarts — escalate to DBA on-call

**Verify:** `db.latency_s < 1.0` on `/health/performance`
**Escalate if:** Not resolved within 15 minutes

---

## Redis Down

**Detect:** `GET /health/performance` returns `redis.ok: false`
**Expected side-effect:** Cache misses spike DB load 2-4x for 5-10 min after restart

1. `docker logs redis --tail 50`
2. `docker restart redis`
3. Monitor DB query rate — expect elevated load during cache warm-up

**Verify:** `redis-cli ping` returns PONG. DB query rate returns to baseline within 10 min.
**Escalate if:** Redis restarts repeatedly (memory issue — check maxmemory config)

---

## LLM Provider Failure

**Detect:** `llm_calls_total{call_type="primary"}` flat. Circuit breaker OPEN in logs.
**Expected side-effect:** Auto-recovery after 120s cooldown. Cost spike if retry storm.

1. Check provider status page
2. Check `LLMRetryStorm` alert in Grafana (cost risk)
3. Circuit breaker auto-recovers after 120s — do not restart manually
4. If provider down > 10 min: set `LLM_FALLBACK_ONLY=true` and restart app

**Verify:** `llm_calls_total` resumes incrementing after cooldown
**Escalate if:** Retry rate stays > 30% after circuit breaker recovery

---

## Stuck Articles

**Detect:** Articles stuck in `analyzing`/`pending` > 30 min. `reconciliation.reconciled` flat.

1. `from tasks import reconcile_stuck_tasks; reconcile_stuck_tasks.delay()`
2. Watch logs for: `reconcile_stuck_tasks: done`
3. Check `reconciliation.reconciled` metric — must be > 0
4. If > 500 articles still stuck after 2 runs:
   `from tasks import cleanup_stuck_articles; cleanup_stuck_articles.delay()`

**Verify:** `SELECT COUNT(*) FROM articles WHERE status IN ('analyzing','pending') AND updated_at < NOW() - INTERVAL '30 minutes'` → should approach 0
**Escalate if:** `errors` metric > 50 in a single reconciliation run

---

## DB/Redis Mismatch Alert

**Detect:** `consistency.mismatches > 10`

1. Check which articles are mismatched in logs (`state mismatch: article X`)
2. Run `reconcile_stuck_tasks.delay()` to rehydrate Redis from DB
3. Re-run `check_state_consistency.delay()` — mismatches should drop to 0

**Verify:** `consistency.mismatches = 0` on next run
**Escalate if:** Mismatches persist after reconciliation — indicates write-path bug
```

---

## Pre-Production Validation Checklist

All items below must pass before deploying to production.

| # | Check | How to Verify | Pass Criteria |
|---|-------|---------------|---------------|
| 1 | Reconciliation job runs and emits metrics | Trigger `reconcile_stuck_tasks.delay()`, watch metrics | `reconciliation.reconciled > 0`, log line `done` appears |
| 2 | Stuck articles drop to near zero | `SELECT COUNT(*) WHERE status IN ('analyzing','pending') AND updated_at < NOW()-30m` | Count < 10 after two run cycles |
| 3 | Consistency monitor compares correct keys | Trigger `check_state_consistency.delay()`, check `consistency.checked` | `checked = 500`, `mismatches = 0` on clean system |
| 4 | Health endpoint returns 503 when Redis down | `docker stop redis`, then `curl -I /health/performance` | HTTP 503 returned, `redis.ok: false` in body |
| 5 | LLM retry storm alert fires | Force retries in staging, wait 5 min | `LLMRetryStorm` alert fires in Grafana/PagerDuty |
| 6 | Redis memory limit enforced | `redis-cli info memory` | `maxmemory = 512mb`, `evicted_keys` stable under load |
| 7 | Runbook has verify step for each incident | Review `RUNBOOK.md` | Every section has a `Verify:` and `Escalate if:` line |
| 8 | Cursor pagination — no row skips on large dataset | Run reconciliation on 5,000+ row dataset; check `reconciled` count vs DB count | No gaps; slow-query log shows no query > 100ms |
| 9 | Redis key builder used in both write path and monitor | Grep codebase for `article:status:` literal string | Zero occurrences — all replaced by `get_article_status_key()` |
| 10 | Cleanup job uses `timeout_failed` not `failed` | Query `SELECT status, retry_allowed FROM articles WHERE failed_reason='cleanup_job_timeout'` | All rows show `timeout_failed` + `retry_allowed = TRUE` |
| 11 | Redis eviction alert fires before silent cache loss | Set `maxmemory 1mb` temporarily; write keys; wait 5 min | `RedisEvictionActive` alert fires; restore correct limit |
| 12 | Enqueue cap prevents queue flood | Trigger reconciliation with 2,000+ stuck articles | `reconciliation.reconciled` stops at 1,000; log shows cap warning |

---

> **Deployment Gate:** System must not be deployed to production until all 12 validation checks above pass. The original 7 checks confirmed operational correctness. Checks 8–12 confirm scalability, key safety, recoverability, and memory observability.

---

*Pulse Pro SRE Blocker-Fix Patch · Updated 2026-03-29 · Final hardening pass — 5 enhancements added covering pagination scalability, Redis key safety, cleanup recoverability, eviction monitoring, and queue flood protection.*
