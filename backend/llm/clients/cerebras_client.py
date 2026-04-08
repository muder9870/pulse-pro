import logging
import requests
import time
from dataclasses import dataclass
from typing import Optional
from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class CerebrasConfig:
    api_key: str
    model: str = "llama3.1-8b"
    base_url: str = "https://api.cerebras.ai/v1/chat/completions"
    max_tokens: int = 4096
    temperature: float = 0.7
    timeout: int = 30
    max_retries: int = 2  # Reduced from 3 to 2


class CerebrasClient:
    def __init__(self):
        self.config = CerebrasConfig(
            api_key=getattr(settings, 'CEREBRAS_API_KEY', ''),
            model=getattr(settings, 'CEREBRAS_MODEL', 'llama3.1-8b')
        )

        if not self.config.api_key:
            raise ValueError("CEREBRAS_API_KEY is missing")

        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        })

    def generate(self, prompt: str, max_tokens: int = 512, temperature: Optional[float] = None) -> str:
        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
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
                    wait_time = min(2 ** attempt, 4)  # Cap at 4 seconds
                    logger.warning(f"Rate limited. Retrying in {wait_time}s...")
                    time.sleep(wait_time)
                    continue

                response.raise_for_status()
                data = response.json()

                # Safe extraction
                return (
                    data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout on attempt {attempt + 1}")
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed: {e}")

            if attempt < self.config.max_retries - 1:  # Don't sleep after last attempt
                wait_time = min(2 ** attempt, 4)
                time.sleep(wait_time)

        raise RuntimeError("Cerebras API failed after retries")