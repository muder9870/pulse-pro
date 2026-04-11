"""
Mistral AI client — free Experiment plan.
Free tier: ~1B tokens/month, per-model rate limits.
Get a free API key at: https://console.mistral.ai
Note: free tier requires opting into data training.
"""
import logging
import time
import requests
from dataclasses import dataclass
from backend.config import settings
from backend.processors.health_monitor import health_monitor

logger = logging.getLogger(__name__)

_BASE_URL = "https://api.mistral.ai/v1/chat/completions"


@dataclass
class MistralClient:
    model: str = None

    def __post_init__(self):
        if self.model is None:
            self.model = getattr(settings, "MISTRAL_MODEL", "mistral-small-latest")
        self.api_key = getattr(settings, "MISTRAL_API_KEY", None)
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY is not set")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or 30
        start = time.monotonic()
        max_retries = 2
        for attempt in range(max_retries):
            try:
                response = requests.post(
                    _BASE_URL,
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
                    wait = min(2 ** attempt, 8)
                    logger.warning("Mistral rate limited, retrying in %ds", wait)
                    time.sleep(wait)
                    continue
                response.raise_for_status()
                data = response.json()
                try:
                    content = data["choices"][0]["message"]["content"]
                except (KeyError, IndexError) as e:
                    raise RuntimeError(f"Malformed Mistral response: {e}") from e
                if not content or not content.strip():
                    raise ValueError("Empty response from Mistral")
                health_monitor.log_success("llm_mistral", int((time.monotonic() - start) * 1000))
                return content
            except Exception as e:
                health_monitor.log_failure("llm_mistral", e)
                if attempt < max_retries - 1:
                    time.sleep(min(2 ** attempt, 8))
                else:
                    raise RuntimeError(f"Mistral API failed after retries: {e}") from e
        raise RuntimeError("Mistral API failed after retries")
