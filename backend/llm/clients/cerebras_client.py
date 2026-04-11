import logging
import requests
import time
from dataclasses import dataclass
from typing import Optional
from backend.config import settings
from backend.processors.health_monitor import health_monitor

logger = logging.getLogger(__name__)


@dataclass
class CerebrasConfig:
    api_key: str
    model: str = "llama3.1-8b"
    base_url: str = "https://api.cerebras.ai/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 2


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
                    wait = min(2 ** attempt, 4)
                    logger.warning("Cerebras rate limited, retrying in %ds", wait)
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
                    raise ValueError("Empty response from Cerebras")
                health_monitor.log_success("llm_cerebras", int((time.monotonic() - start) * 1000))
                return content
            except requests.exceptions.Timeout:
                logger.warning("Cerebras timeout on attempt %d", attempt + 1)
                health_monitor.log_failure("llm_cerebras", TimeoutError("Cerebras timeout"))
            except Exception as e:
                logger.error("Cerebras request failed: %s", e)
                health_monitor.log_failure("llm_cerebras", e)
            if attempt < self.config.max_retries - 1:
                time.sleep(min(2 ** attempt, 4))

        raise RuntimeError("Cerebras API failed after retries")