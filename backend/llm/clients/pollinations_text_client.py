"""
Pollinations.ai text client — completely free, no API key required.
Uses GET endpoint: https://gen.pollinations.ai/text/{prompt}
Rate limited but generous for single-user self-hosted use.
Use as last-resort fallback before system_fallback.
"""
import logging
import time
import urllib.parse
import requests
from dataclasses import dataclass
from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PollinationsTextClient:
    model: str = "openai"  # GPT-5 Nano via Pollinations

    def __post_init__(self):
        # Check if explicitly disabled
        enabled = getattr(settings, "POLLINATIONS_TEXT_ENABLED", True)
        if not enabled:
            raise ValueError("Pollinations text client is disabled via POLLINATIONS_TEXT_ENABLED=false")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or 30
        # Truncate prompt to avoid URL length issues
        truncated = prompt[:3000]
        encoded = urllib.parse.quote(truncated)
        url = f"https://gen.pollinations.ai/text/{encoded}?model={self.model}&seed=-1"

        try:
            response = requests.get(url, timeout=effective_timeout)
            if response.status_code == 429:
                raise RuntimeError("Pollinations text rate limited")
            response.raise_for_status()
            content = response.text.strip()
            if not content:
                raise ValueError("Empty response from Pollinations text")
            return content
        except Exception as e:
            logger.warning("Pollinations text failed: %s", e)
            raise RuntimeError(f"Pollinations text API failed: {e}") from e
