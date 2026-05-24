import logging
import time
import requests
from dataclasses import dataclass
from typing import Optional
from backend.config import settings
from backend.llm.base_provider import BaseLLMProvider, RateLimitError

logger = logging.getLogger(__name__)


@dataclass
class OpenRouterConfig:
    api_key: str
    model: str = "anthropic/claude-3-haiku"
    base_url: str = "https://openrouter.ai/api/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30


class OpenRouterClient(BaseLLMProvider):
    def __init__(self):
        super().__init__(provider_name="openrouter")
        self.config = OpenRouterConfig(
            api_key=getattr(settings, "OPENROUTER_API_KEY", ""),
            model=getattr(settings, "OPENROUTER_MODEL", "anthropic/claude-3-haiku"),
        )
        if not self.config.api_key:
            raise ValueError("OPENROUTER_API_KEY is missing")

        base_url = getattr(settings, "BASE_URL", "http://localhost:3000")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": base_url,
            "X-Title": "Pulse Pro AI Pipeline",
        })

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or self.config.timeout
        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": min(max_tokens, self.config.max_tokens),
            "temperature": self.config.temperature,
        }
        start_time = time.monotonic()

        try:
            response = self.session.post(
                self.config.base_url, json=payload, timeout=effective_timeout
            )

            if response.status_code == 429:
                retry_after = self._parse_retry_after(response)
                raise RateLimitError(
                    message="OpenRouter rate limit exceeded",
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
                raise ValueError("Empty response from OpenRouter")

            self._log_success(start_time)
            return content

        except requests.exceptions.Timeout as e:
            logger.warning("OpenRouter timeout")
            self._log_failure(start_time, TimeoutError("OpenRouter timeout"))
            raise e
        except Exception as e:
            logger.error("OpenRouter request failed: %s", e)
            self._log_failure(start_time, e)
            raise e
