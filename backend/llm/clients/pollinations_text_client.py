"""
Pollinations.ai text client — API key required (get from enter.pollinations.ai).
Uses GET endpoint: https://gen.pollinations.ai/text/{prompt}
Use as last-resort fallback before system_fallback.
"""
import logging
import urllib.parse
import requests
from dataclasses import dataclass
from backend.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PollinationsTextClient:
    model: str = "openai"  # GPT-5 Nano via Pollinations
    api_key: str | None = None

    def __post_init__(self):
        # Check if explicitly disabled
        enabled = getattr(settings, "POLLINATIONS_TEXT_ENABLED", True)
        if not enabled:
            raise ValueError("Pollinations text client is disabled via POLLINATIONS_TEXT_ENABLED=false")
        
        # Get API key from settings
        self.api_key = getattr(settings, "POLLINATIONS_API_KEY", None)
        if not self.api_key:
            logger.warning("Pollinations API key not set - may get 401 errors")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or 30
        # Truncate prompt to avoid URL length issues
        truncated = prompt[:3000]
        encoded = urllib.parse.quote(truncated)
        url = f"https://gen.pollinations.ai/text/{encoded}?model={self.model}&seed=-1"
        
        # Add API key as query parameter for backwards compatibility
        if self.api_key:
            url += f"&key={self.api_key}"

        try:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            response = requests.get(url, headers=headers, timeout=effective_timeout)
            if response.status_code == 429:
                raise RuntimeError("Pollinations text rate limited")
            if response.status_code == 401:
                raise RuntimeError("Pollinations API unauthorized - check your POLLINATIONS_API_KEY")
            response.raise_for_status()
            content = response.text.strip()
            if not content:
                raise ValueError("Empty response from Pollinations text")
            return content
        except Exception as e:
            logger.warning("Pollinations text failed: %s", e)
            raise RuntimeError(f"Pollinations text API failed: {e}") from e
