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

---

## Escalation Contacts

| Severity | Contact | Threshold |
|----------|---------|-----------|
| Critical | Principal SRE + Engineering Lead | Immediate - System down |
| High | SRE Team | 15 minutes - Service degraded |
| Medium | SRE Team | 1 hour - Performance impact |
| Low | Engineering Team | 4 hours - Minor issues |

---

## Service Dependencies

| Service | Health Check | Failover |
|---------|---------------|----------|
| PostgreSQL | `/health/performance` → `db.ok` | Manual restart |
| Redis | `/health/performance` → `redis.ok` | Manual restart |
| LLM Provider | `llm_calls_total` metrics | Circuit breaker + fallback |

---

## Cost Monitoring Alerts

| Alert | Trigger | Action |
|-------|---------|--------|
| LLMRetryStorm | Retry rate > 30% for 5m | Check provider status, consider fallback |
| RedisMemoryPressure | `evicted_keys` increasing | Check key volume, consider memory increase |
| StuckArticles | Stuck articles > 100 | Run reconciliation job |
