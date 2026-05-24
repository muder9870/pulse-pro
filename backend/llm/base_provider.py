import logging
import time
import random
import redis
from typing import Optional
from dataclasses import dataclass
from backend.config import settings
from backend.processors.health_monitor import health_monitor
from backend.metrics import metrics

logger = logging.getLogger(__name__)


@dataclass
class RateLimitError(RuntimeError):
    """Raised when a provider rate limit is exceeded."""
    message: str
    retry_after: Optional[float] = None


@dataclass
class ProviderError(RuntimeError):
    """General provider error."""
    message: str


@dataclass
class RetryLaterError(RuntimeError):
    """Raised to indicate a task should be retried later with a specific delay."""
    message: str
    retry_after: Optional[float] = None


class BaseLLMProvider:
    """Base class for all LLM providers to standardize behavior."""

    def __init__(self, provider_name: str):
        self.provider_name = provider_name
        self.redis_client = None
        if getattr(settings, "REDIS_URL", None):
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL)
            except Exception:
                self.redis_client = None

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        """
        Generate text from the provider.
        Must be implemented by subclasses.
        Should raise RateLimitError or ProviderError on failure.
        """
        raise NotImplementedError("Subclasses must implement generate()")

    def _check_global_rate_limit(
        self,
        key_prefix: str,
        max_calls: int,
        window_seconds: int
    ) -> None:
        """
        Check Redis-backed global rate limit.
        Raises RateLimitError if exceeded.
        """
        if not self.redis_client or max_calls <= 0:
            return

        window = int(time.time() // window_seconds)
        key = f"{key_prefix}:{window}"
        count = self.redis_client.incr(key)
        if count == 1:
            self.redis_client.expire(key, window_seconds + 1)

        if count > max_calls:
            metrics.increment('llm_provider_retry_total', labels={
                'provider': self.provider_name,
                'reason': 'rate_limited'
            })
            raise RateLimitError(
                f"{self.provider_name} global rate limit exceeded ({max_calls} calls per {window_seconds}s)."
            )

    def _acquire_inflight_slot(
        self,
        key: str,
        max_calls: int,
        timeout_seconds: int
    ) -> None:
        """
        Acquire an inflight request slot using Redis Lua script.
        Raises RateLimitError if limit exceeded.
        """
        if not self.redis_client or max_calls <= 0:
            return

        script = """
local key = KEYS[1]
local max_calls = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])
local current = tonumber(redis.call('GET', key) or '0')
if current < max_calls then
  current = current + 1
  redis.call('SET', key, current, 'EX', ttl)
  return 1
end
return 0
"""
        acquired = self.redis_client.eval(
            script,
            1,
            key,
            max_calls,
            timeout_seconds,
        )
        if not acquired:
            metrics.increment('llm_provider_retry_total', labels={
                'provider': self.provider_name,
                'reason': 'inflight_limit'
            })
            raise RateLimitError(
                f"{self.provider_name} inflight limit exceeded ({max_calls} concurrent requests)."
            )

    def _release_inflight_slot(self, key: str, timeout_seconds: int) -> None:
        """Release an inflight request slot using Redis Lua script."""
        if not self.redis_client or not key:
            return

        script = """
local key = KEYS[1]
local ttl = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')
if current <= 1 then
  redis.call('DEL', key)
  return 0
end
current = current - 1
redis.call('SET', key, current, 'EX', ttl)
return current
"""
        try:
            self.redis_client.eval(script, 1, key, timeout_seconds)
        except Exception:
            pass

    def _parse_retry_after(self, response) -> Optional[float]:
        """Parse Retry-After header from a requests.Response object."""
        ra = response.headers.get("Retry-After")
        if not ra:
            return None
        try:
            return float(ra)
        except (ValueError, TypeError):
            return None

    def _log_success(self, start_time: float) -> None:
        """Log a successful request to health_monitor and metrics."""
        duration_ms = int((time.monotonic() - start_time) * 1000)
        health_monitor.log_success(f"llm_{self.provider_name}", duration_ms)

    def _log_failure(self, start_time: float, exception: Exception) -> None:
        """Log a failed request to health_monitor and metrics."""
        duration_ms = int((time.monotonic() - start_time) * 1000)
        health_monitor.log_failure(f"llm_{self.provider_name}", exception)
