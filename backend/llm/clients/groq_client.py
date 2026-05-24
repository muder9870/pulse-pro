import logging
import time
import requests
from dataclasses import dataclass
from backend.config import settings
from backend.llm.base_provider import BaseLLMProvider, RateLimitError

logger = logging.getLogger(__name__)


@dataclass
class GroqClient(BaseLLMProvider):
    model: str = None

    def __post_init__(self):
        super().__init__(provider_name="groq")
        if self.model is None:
            self.model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")
        self.api_key = getattr(settings, "GROQ_API_KEY", None)
        if not self.api_key or self.api_key == "your_groq_api_key_here":
            raise ValueError("GROQ_API_KEY not set")

        self.rate_limit_max_calls = getattr(settings, "GROQ_RATE_LIMIT_MAX_CALLS", 28)
        self.rate_limit_window = getattr(settings, "GROQ_RATE_LIMIT_WINDOW_SECONDS", 60)
        self.rate_limit_key_prefix = "groq:rate_limit"
        self.inflight_max_calls = getattr(settings, "GROQ_MAX_INFLIGHT_CALLS", 5)
        self.inflight_timeout = getattr(settings, "GROQ_INFLIGHT_TIMEOUT_SECONDS", 120)
        self.inflight_key = "groq:inflight"

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = 10) -> str:
        effective_timeout = timeout or 10
        start_time = time.monotonic()

        self._check_global_rate_limit(
            key_prefix=self.rate_limit_key_prefix,
            max_calls=self.rate_limit_max_calls,
            window_seconds=self.rate_limit_window
        )
        self._acquire_inflight_slot(
            key=self.inflight_key,
            max_calls=self.inflight_max_calls,
            timeout_seconds=self.inflight_timeout
        )

        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                },
                timeout=effective_timeout,
            )

            if response.status_code == 429:
                retry_after = self._parse_retry_after(response)
                raise RateLimitError(
                    message="Groq rate limit exceeded",
                    retry_after=retry_after
                )

            response.raise_for_status()
            data = response.json()

            if "choices" not in data or not data["choices"]:
                raise ValueError("Invalid response: no choices field")
            if "message" not in data["choices"][0] or "content" not in data["choices"][0]["message"]:
                raise ValueError("Invalid response: missing message content")

            text = data["choices"][0]["message"]["content"]
            if not text or not text.strip():
                raise ValueError("Empty response from Groq")

            self._log_success(start_time)
            return text

        except requests.exceptions.Timeout as e:
            self._log_failure(start_time, e)
            raise TimeoutError("Groq timeout") from e
        except Exception as e:
            self._log_failure(start_time, e)
            raise e
        finally:
            self._release_inflight_slot(
                key=self.inflight_key,
                timeout_seconds=self.inflight_timeout
            )

