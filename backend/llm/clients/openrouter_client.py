import logging
import requests
import time
from dataclasses import dataclass
from typing import Optional
from backend.config import settings
from backend.processors.health_monitor import health_monitor

logger = logging.getLogger(__name__)


@dataclass
class OpenRouterConfig:
    api_key: str
    model: str = "anthropic/claude-3-haiku"
    base_url: str = "https://openrouter.ai/api/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 3


class OpenRouterClient:
    def __init__(self):
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
        start = time.monotonic()
        for attempt in range(self.config.max_retries):
            try:
                response = self.session.post(
                    self.config.base_url, json=payload, timeout=effective_timeout
                )
                if response.status_code == 429:
                    wait = min(2 ** attempt, 8)
                    logger.warning("OpenRouter rate limited, retrying in %ds", wait)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                data = response.json()
                content = (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                if not content:
                    raise ValueError("Empty response from OpenRouter")
                health_monitor.log_success("llm_openrouter", int((time.monotonic() - start) * 1000))
                return content
            except requests.exceptions.Timeout:
                logger.warning("OpenRouter timeout on attempt %d", attempt + 1)
                health_monitor.log_failure("llm_openrouter", TimeoutError("OpenRouter timeout"))
            except Exception as e:
                logger.error("OpenRouter request failed: %s", e)
                health_monitor.log_failure("llm_openrouter", e)
            if attempt < self.config.max_retries - 1:
                time.sleep(min(2 ** attempt, 8))

        raise RuntimeError("OpenRouter API failed after retries")