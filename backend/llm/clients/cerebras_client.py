import logging
import requests
import time
import random
from dataclasses import dataclass
from typing import Optional
from backend.config import settings
from backend.metrics import metrics
from backend.processors.health_monitor import health_monitor
import redis

logger = logging.getLogger(__name__)


@dataclass
class CerebrasConfig:
    api_key: str
    model: str = "llama3.1-8b"
    base_url: str = "https://api.cerebras.ai/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30


class CerebrasRateLimitError(RuntimeError):
    def __init__(self, message, retry_after: float | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class CerebrasClient:
    def __init__(self):
        self.config = CerebrasConfig(
            api_key=getattr(settings, "CEREBRAS_API_KEY", ""),
            model=getattr(settings, "CEREBRAS_MODEL", "llama3.1-8b"),
        )
        if not self.config.api_key:
            raise ValueError("CEREBRAS_API_KEY is missing")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        })

        self.redis_client = None
        if getattr(settings, "REDIS_URL", None):
            try:
                self.redis_client = redis.from_url(settings.REDIS_URL)
            except Exception:
                self.redis_client = None

        self.rate_limit_max_calls = getattr(settings, "CEREBRAS_RATE_LIMIT_MAX_CALLS", 30)
        self.rate_limit_window = getattr(settings, "CEREBRAS_RATE_LIMIT_WINDOW_SECONDS", 60)
        self.rate_limit_key_prefix = "cerebras:rate_limit"
        self.inflight_max_calls = getattr(settings, "CEREBRAS_MAX_INFLIGHT_CALLS", 3)
        self.inflight_timeout = getattr(settings, "CEREBRAS_INFLIGHT_TIMEOUT_SECONDS", 120)
        self.inflight_key = "cerebras:inflight"

    def _check_rate_limit(self) -> None:
        if not self.redis_client or self.rate_limit_max_calls <= 0:
            return

        window = int(time.time() // self.rate_limit_window)
        key = f"{self.rate_limit_key_prefix}:{window}"
        count = self.redis_client.incr(key)
        if count == 1:
            self.redis_client.expire(key, self.rate_limit_window + 1)

        if count > self.rate_limit_max_calls:
            metrics.increment('llm_provider_retry_total', labels={'provider': 'cerebras', 'reason': 'rate_limited'})
            raise CerebrasRateLimitError(
                f"Cerebras global rate limit exceeded ({self.rate_limit_max_calls} calls per {self.rate_limit_window}s)."
            )

    def _acquire_inflight_slot(self) -> None:
        if not self.redis_client or self.inflight_max_calls <= 0:
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
            self.inflight_key,
            self.inflight_max_calls,
            self.inflight_timeout,
        )
        if not acquired:
            metrics.increment('llm_provider_retry_total', labels={'provider': 'cerebras', 'reason': 'inflight_limit'})
            raise CerebrasRateLimitError(
                f"Cerebras inflight limit exceeded ({self.inflight_max_calls} concurrent requests)."
            )

    def _release_inflight_slot(self) -> None:
        if not self.redis_client or self.inflight_max_calls <= 0:
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
            self.redis_client.eval(script, 1, self.inflight_key, self.inflight_timeout)
        except Exception:
            pass

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or self.config.timeout
        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": min(max_tokens, self.config.max_tokens),
            "temperature": self.config.temperature,
        }
        start = time.monotonic()
        self._check_rate_limit()
        self._acquire_inflight_slot()
        try:
            response = self.session.post(
                self.config.base_url, json=payload, timeout=effective_timeout
            )
            if response.status_code == 429:
                ra = response.headers.get("Retry-After")
                retry_after = None
                try:
                    retry_after = float(ra) if ra is not None else None
                except Exception:
                    pass
                metrics.increment('llm_provider_retry_total', labels={'provider': 'cerebras', 'reason': 'rate_limited'})
                raise CerebrasRateLimitError(
                    f"Cerebras rate limited.",
                    retry_after=retry_after
                )
            response.raise_for_status()
            data = response.json()
            content = (
                data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            if not content:
                raise ValueError("Empty response from Cerebras")
            health_monitor.log_success("llm_cerebras", int((time.monotonic() - start) * 1000))
            return content
        except requests.exceptions.Timeout as e:
            logger.warning("Cerebras timeout")
            health_monitor.log_failure("llm_cerebras", TimeoutError("Cerebras timeout"))
            raise e
        except Exception as e:
            logger.error("Cerebras request failed: %s", e)
            health_monitor.log_failure("llm_cerebras", e)
            raise e
        finally:
            self._release_inflight_slot()