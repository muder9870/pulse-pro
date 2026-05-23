# Pulse Pro - Action Tasks

This file lists the comprehensive tasks to address Celery/LLM pipeline reliability, rate limiting, and observability. Prioritize items in the Immediate / Medium / Future groups.

## Immediate (high priority)
- [x] Add exponential backoff with randomized jitter for provider retries (cap max delay).
- [x] Fix `fallback` boolean so it is `true` when a fallback provider was used (analytics integrity).
- [x] Implement a global provider cooldown when circuit-breaker opens (30–60s open window) and route calls to fallback.
- [x] Add minimal metrics instrumentation: provider success rate, p95 latency, retry count, fallback percentage, queue wait time.
- [x] Ensure circuit-breaker state is shared across workers (Redis or DB) instead of per-process.

## Short-term / Medium
- [x] Implement a Redis-backed global rate limiter (fixed-window, shared across workers) for Cerebras calls.
- [x] Add distributed semaphore or inflight request limiter to bound concurrency to provider budget.
- [ ] Separate queues by priority (light / heavy / retry) or use routing to reduce thundering-herd surface.
- [x] Honor `Retry-After` / rate-limit response headers from Cerebras when present.
- [x] Add request-level jitter to avoid synchronized retry storms across workers.
- [ ] Add unit and integration tests to simulate bursts and measure rate-limit reduction.

## Observability & Monitoring
- [ ] Export provider metrics to Prometheus (counts, latencies, retries, fallbacks).
- [ ] Dashboards: provider success rate, p95/p99 latency, retry storms, fallback percentage, queue depth, queue wait time.
- [ ] Add alerts: sustained rate-limited errors, elevated retry counts, circuit-breaker open rate.

## Future / Nice-to-have
- [ ] Dynamic provider load balancing and cost-aware routing between Cerebras / Mistral and other llms.
- [ ] Adaptive concurrency control tuned to provider SLAs and cost targets.
- [ ] Backpressure signals from provider-adapters to the queue (e.g., reduce consumption rate).
- [ ] Graceful draining / scaling strategies to avoid bursts during autoscaling events.

## Tests & Validation
- [ ] Synthetic thundering-herd test harness to replay task arrival patterns and assert reduced rate-limit errors.
- [ ] Before/after metrics capture to compare impact of jitter + global cooldown + rate limiter.

## Notes
- Default branch (source-of-truth) in this repository: `fix-execution-sheet` (merge target for this change).
- New feature branch created after merge: `feature/cerebras-rate-limiter-fixes`.

---
Document created: add tasks, priorities, and validation steps for addressing rate limiting and resilience.
