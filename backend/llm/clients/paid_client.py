import logging
import requests
import time
from dataclasses import dataclass
from backend.config import settings
from backend.processors.health_monitor import health_monitor

@dataclass
class PaidApiLLMClient:
    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        start_time = time.monotonic()
        try:
            if getattr(settings, "OPENAI_API_KEY", None):
                model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
                res = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {settings.OPENAI_API_KEY}"},
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens,
                    },
                    timeout=60,
                )
                res.raise_for_status()
                data = res.json()
                response = data["choices"][0]["message"]["content"]
                health_monitor.log_success("llm", int((time.monotonic() - start_time) * 1000))
                return response

            if getattr(settings, "ANTHROPIC_API_KEY", None):
                model = getattr(settings, "ANTHROPIC_MODEL", "claude-3-5-haiku-latest")
                res = requests.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": str(settings.ANTHROPIC_API_KEY),
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model,
                        "max_tokens": max_tokens,
                        "messages": [{"role": "user", "content": prompt}],
                    },
                    timeout=60,
                )
                res.raise_for_status()
                data = res.json()
                response = data["content"][0]["text"]
                health_monitor.log_success("llm", int((time.monotonic() - start_time) * 1000))
                return response

            raise RuntimeError("Missing Paid API Keys")
        except Exception as e:
            health_monitor.log_failure("llm", e)
            raise e
