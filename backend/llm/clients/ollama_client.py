import logging
import requests
import time
from dataclasses import dataclass
from backend.config import settings
from backend.llm.base_provider import BaseLLMProvider

logger = logging.getLogger(__name__)

@dataclass
class LocalOllamaClient(BaseLLMProvider):
    model: str = None

    def __post_init__(self):
        super().__init__(provider_name="ollama")
        if self.model is None:
            self.model = getattr(settings, "OLLAMA_MODEL", "llama3")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = None) -> str:
        start_time = time.monotonic()
        effective_timeout = timeout or 90
        base = str(getattr(settings, "OLLAMA_HOST", "http://127.0.0.1:11434") or "").strip()
        if not base.startswith(("http://", "https://")):
            base = "http://" + base
        base = base.rstrip("/")

        try:
            r = requests.post(
                f"{base}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"num_predict": max_tokens, "num_ctx": 16384},
                },
                timeout=effective_timeout,
            )
            r.raise_for_status()
            data = r.json()
            response = data.get("response", "")
            if not response or not response.strip():
                raise ValueError("Empty response from Ollama")
            self._log_success(start_time)
            return response
        except Exception as e:
            self._log_failure(start_time, e)
            raise
