import logging
import requests
import time
from dataclasses import dataclass
from typing import Optional
from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class OpenRouterConfig:
    api_key: str
    model: str = "anthropic/claude-3-haiku"
    base_url: str = "https://openrouter.ai/api/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    referer: str = "http://localhost:3000"
    timeout: int = 30
    max_retries: int = 3


class OpenRouterClient:
    def __init__(self):
        self.config = OpenRouterConfig(
            api_key=getattr(settings, 'OPENROUTER_API_KEY', ''),
            model=getattr(settings, 'OPENROUTER_MODEL', 'anthropic/claude-3-haiku')
        )

        if not self.config.api_key:
            raise ValueError("OPENROUTER_API_KEY is missing")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": self.config.referer,
            "X-Title": "Pulse Pro AI Pipeline"
        })

    def generate(self, prompt: str, max_tokens: int = 512, temperature: Optional[float] = None) -> str:
        payload = {
            "model": self.config.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "max_tokens": min(max_tokens, self.config.max_tokens),
            "temperature": temperature if temperature is not None else self.config.temperature
        }

        for attempt in range(self.config.max_retries):
            try:
                response = self.session.post(
                    self.config.base_url,
                    json=payload,
                    timeout=self.config.timeout
                )

                if response.status_code == 429:
                    wait = 2 ** attempt
                    logger.warning(f"Rate limited. Retrying in {wait}s...")
                    time.sleep(wait)
                    continue

                response.raise_for_status()
                data = response.json()

                return (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")

            time.sleep(2 ** attempt)

        raise RuntimeError("OpenRouter API failed after retries")