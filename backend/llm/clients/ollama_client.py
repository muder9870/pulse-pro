import logging
import requests
import time
from dataclasses import dataclass
from backend.config import settings
from backend.processors.health_monitor import health_monitor

@dataclass
class LocalOllamaClient:
    model: str = None

    def __post_init__(self):
        if self.model is None:
            self.model = getattr(settings, "OLLAMA_MODEL", "llama3")

    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        start_time = time.monotonic()
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
                timeout=90,
            )
            r.raise_for_status()
            data = r.json()
            response = data.get("response", "")
            
            duration_ms = int((time.monotonic() - start_time) * 1000)
            health_monitor.log_success("llm", duration_ms=duration_ms)
            return response
        except Exception as e:
            health_monitor.log_failure("llm", e)
            raise e
