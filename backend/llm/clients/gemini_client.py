"""
Google Gemini client — uses the OpenAI-compatible endpoint.
Free tier: 30 RPM, 1000 RPD (Gemini 2.0 Flash-Lite as of April 2026).
Get a free API key at: https://aistudio.google.com
"""
import logging
import time
import requests
from dataclasses import dataclass
from backend.config import settings
from backend.llm.base_provider import BaseLLMProvider, RateLimitError

logger = logging.getLogger(__name__)

_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"


@dataclass
class GeminiClient(BaseLLMProvider):
    model: str = None

    def __post_init__(self):
        super().__init__(provider_name="gemini")
        if self.model is None:
            self.model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash-lite")
        self.api_key = getattr(settings, "GEMINI_API_KEY", None)
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        effective_timeout = timeout or 30
        start_time = time.monotonic()
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
                retry_after = self._parse_retry_after(response)
                raise RateLimitError(
                    message="Gemini rate limit exceeded",
                    retry_after=retry_after
                )
            response.raise_for_status()
            data = response.json()
            try:
                content = data["choices"][0]["message"]["content"]
            except (KeyError, IndexError) as e:
                raise RuntimeError(f"Malformed Gemini response: {e}") from e
            if not content or not content.strip():
                raise ValueError("Empty response from Gemini")
            self._log_success(start_time)
            return content
        except Exception as e:
            self._log_failure(start_time, e)
            raise
