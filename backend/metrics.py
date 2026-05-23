import os
import threading
import time
import redis
from typing import Dict, Any
from prometheus_client import Counter, Gauge, Histogram, CollectorRegistry

class PipelineMetrics:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self.registry = CollectorRegistry()
        
        # Counters
        self.articles_ingested = Counter('articles_ingested_total', 'Total articles ingested', registry=self.registry)
        self.articles_analyzed = Counter('articles_analyzed_total', 'Total articles analyzed', registry=self.registry)
        self.articles_fallback = Counter('articles_fallback_total', 'Total fallback analyses', registry=self.registry)
        self.llm_validation_errors = Counter('llm_validation_errors_total', 'Total LLM validation errors', registry=self.registry)
        self.pipeline_runs = Counter('pipeline_runs_total', 'Total pipeline runs', registry=self.registry)
        self.task_retries = Counter('task_retries_total', 'Total task retries', ['task_type'], registry=self.registry)
        self.cache_hits = Counter('cache_hits_total', 'Total cache hits', ['cache_type'], registry=self.registry)
        
        # Cost monitoring counters (replacing duplicate llm_calls)
        self.llm_calls_cost = Counter('llm_calls_cost_total', 'Total LLM calls for cost tracking', ['model', 'call_type'], registry=self.registry)
        self.llm_tokens_total = Counter('llm_tokens_total', 'Total tokens consumed', ['model'], registry=self.registry)
        self.llm_retries_total = Counter('llm_retries_total', 'LLM retry attempts', ['model'], registry=self.registry)
        self.llm_provider_calls = Counter('llm_provider_calls_total', 'Total LLM provider calls', ['provider'], registry=self.registry)
        self.llm_provider_success = Counter('llm_provider_success_total', 'Total successful LLM provider calls', ['provider'], registry=self.registry)
        self.llm_provider_failure = Counter('llm_provider_failure_total', 'Total failed LLM provider calls', ['provider'], registry=self.registry)
        self.llm_provider_fallback = Counter('llm_provider_fallback_total', 'Total LLM fallback provider calls', ['provider'], registry=self.registry)
        self.llm_provider_retry = Counter('llm_provider_retry_total', 'Total LLM provider retries or failover events', ['provider', 'reason'], registry=self.registry)
        
        # Redis eviction monitoring gauges
        self.redis_evicted_keys = Gauge('redis_evicted_keys_total', 'Cumulative number of keys evicted by Redis due to maxmemory policy', registry=self.registry)
        self.redis_used_memory_bytes = Gauge('redis_used_memory_bytes', 'Current Redis memory usage in bytes', registry=self.registry)
        
        # Cost tracking and limiting
        self.llm_cost_today = Gauge('llm_cost_usd_today', 'LLM cost today in USD', registry=self.registry)
        self.llm_retry_storm_active = Gauge('llm_retry_storm_active', 'Retry storm in progress (1=active, 0=inactive)', registry=self.registry)
        
        # Gauges
        self.active_workers = Gauge('active_workers', 'Number of active workers', registry=self.registry)
        self.queue_depth = Gauge('queue_depth', 'Current queue depth', ['queue'], registry=self.registry)
        
        # Histograms
        self.task_duration = Histogram('task_duration_seconds', 'Task duration', ['task_type'], registry=self.registry)
        self.llm_call_duration = Histogram('llm_call_duration_seconds', 'LLM call duration', ['provider'], registry=self.registry)
        self.llm_latency = Histogram('llm_latency_seconds', 'LLM call latency', ['model'], registry=self.registry)
        self.task_queue_wait = Histogram('task_queue_wait_seconds', 'Task queue wait time before worker execution', ['queue'], registry=self.registry)
        
        # Legacy stats for backward compatibility
        self.stats = {
            "articles_ingested_total": 0,
            "articles_analyzed_total": 0,
            "articles_fallback_total": 0,
            "llm_validation_errors_total": 0,
            "pipeline_runs_total": 0,
            "last_pipeline_duration_seconds": 0.0,
        }

    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def increment(self, metric: str, count: int = 1, labels: Dict[str, str] = None):
        with self._lock:
            if metric in self.stats:
                self.stats[metric] += count
            
            # Prometheus counters
            if metric == 'articles_ingested_total':
                self.articles_ingested.inc(count)
            elif metric == 'articles_analyzed_total':
                self.articles_analyzed.inc(count)
            elif metric == 'articles_fallback_total':
                self.articles_fallback.inc(count)
            elif metric == 'llm_validation_errors_total':
                self.llm_validation_errors.inc(count)
            elif metric == 'pipeline_runs_total':
                self.pipeline_runs.inc(count)
            elif metric == 'task_retries_total' and labels:
                self.task_retries.labels(**labels).inc(count)
            elif metric == 'llm_calls_total' and labels:
                self.llm_calls_cost.labels(**labels).inc(count)
            elif metric == 'llm_provider_calls_total' and labels:
                self.llm_provider_calls.labels(**labels).inc(count)
            elif metric == 'llm_provider_success_total' and labels:
                self.llm_provider_success.labels(**labels).inc(count)
            elif metric == 'llm_provider_failure_total' and labels:
                self.llm_provider_failure.labels(**labels).inc(count)
            elif metric == 'llm_provider_fallback_total' and labels:
                self.llm_provider_fallback.labels(**labels).inc(count)
            elif metric == 'llm_provider_retry_total' and labels:
                self.llm_provider_retry.labels(**labels).inc(count)
            elif metric == 'cache_hits_total' and labels:
                self.cache_hits.labels(**labels).inc(count)

    def observe(self, metric: str, value: float, labels: Dict[str, str] = None):
        if metric == 'task_duration_seconds' and labels:
            self.task_duration.labels(**labels).observe(value)
        elif metric == 'llm_call_duration_seconds' and labels:
            self.llm_call_duration.labels(**labels).observe(value)
        elif metric == 'llm_latency_seconds' and labels:
            self.llm_latency.labels(**labels).observe(value)
        elif metric == 'task_queue_wait_seconds' and labels:
            self.task_queue_wait.labels(**labels).observe(value)

    def set_gauge(self, metric: str, value: float, labels: Dict[str, str] = None):
        if metric == 'active_workers':
            self.active_workers.set(value)
        elif metric == 'queue_depth' and labels:
            self.queue_depth.labels(**labels).set(value)
        elif metric == 'redis_evicted_keys_total':
            self.redis_evicted_keys.set(value)
        elif metric == 'redis_used_memory_bytes':
            self.redis_used_memory_bytes.set(value)
        elif metric == 'llm_cost_usd_today':
            self.llm_cost_today.set(value)
        elif metric == 'llm_retry_storm_active':
            self.llm_retry_storm_active.set(value)

    def set_value(self, metric: str, value: Any):
        with self._lock:
            if metric in self.stats:
                self.stats[metric] = value

    def get_all(self) -> Dict[str, Any]:
        with self._lock:
            return self.stats.copy()

    def get_prometheus_metrics(self):
        """Return Prometheus metrics for /metrics endpoint."""
        from prometheus_client import generate_latest
        return generate_latest(self.registry)

    def track_llm_call(
        self,
        model: str,
        tokens: int,
        latency: float,
        is_retry: bool = False,
        call_type: str = "primary",
        cost_per_token: float = 0.002
    ):
        """Track LLM call with cost monitoring and limits."""
        # Check daily budget
        current_cost = self.llm_cost_today._value._value if hasattr(self.llm_cost_today._value, '_value') else 0
        daily_budget = float(os.getenv('LLM_DAILY_BUDGET', '100.0'))
        
        call_cost = tokens * cost_per_token
        if current_cost + call_cost > daily_budget:
            raise Exception(f"Daily LLM budget exceeded: {current_cost} + {call_cost} > {daily_budget}")
        
        # Track cost
        self.llm_cost_today.inc(call_cost)
        
        # Detect retry storm
        recent_retries = 0
        try:
            recent_retries = self.llm_retries_total._value._value if hasattr(self.llm_retries_total._value, '_value') else 0
        except:
            recent_retries = 0
            
        if recent_retries > 50:  # Threshold
            self.llm_retry_storm_active.set(1)
            raise Exception("Retry storm detected - blocking further LLM calls")
        
        # Normal tracking
        self.llm_calls_cost.labels(model=model, call_type=call_type).inc()
        self.llm_tokens_total.labels(model=model).inc(tokens)
        self.llm_latency.labels(model=model).observe(latency)
        if is_retry:
            self.llm_retries_total.labels(model=model).inc()

    def scrape_redis_memory_metrics(self, redis_client):
        """Call this on a schedule (e.g. every 30s via a Celery beat task)."""
        try:
            info = redis_client.info("stats")
            self.redis_evicted_keys.set(info.get("evicted_keys", 0))

            mem_info = redis_client.info("memory")
            self.redis_used_memory_bytes.set(mem_info.get("used_memory", 0))
        except Exception as e:
            # Log error but don't fail metrics collection
            import logging
            logging.error(f"Failed to scrape Redis metrics: {e}")

metrics = PipelineMetrics.get_instance()
