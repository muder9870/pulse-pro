import logging
import time
import requests
import threading
from dataclasses import dataclass
from backend.config import settings
from backend.processors.health_monitor import health_monitor

_groq_lock = threading.Lock()
_groq_request_times: list[float] = []
GROQ_RPM_LIMIT: int = 28

def _wait_for_groq_rate_limit() -> None:
    _rate_log = logging.getLogger("llm.rate_limiter")
    while True:
        _groq_lock.acquire()
        try:
            now = time.monotonic()
            cutoff = now - 60.0
            while _groq_request_times and _groq_request_times[0] < cutoff:
                _groq_request_times.pop(0)

            if len(_groq_request_times) < GROQ_RPM_LIMIT:
                _groq_request_times.append(time.monotonic())
                return
            sleep_for = 60.0 - (now - _groq_request_times[0]) + 0.05
        finally:
            _groq_lock.release()
        time.sleep(max(0.0, sleep_for))

class GroqRateLimitError(RuntimeError):
    pass

@dataclass
class GroqClient:
    model: str = None

    def __post_init__(self):
        if self.model is None:
            self.model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")

    def generate(self, prompt: str, max_tokens: int = 512, timeout: int = 10) -> str:
        _wait_for_groq_rate_limit()
        api_key = getattr(settings, "GROQ_API_KEY", None)
        if not api_key or api_key == "your_groq_api_key_here":
            raise RuntimeError("GROQ_API_KEY not set")

        start_time = time.monotonic()
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": max_tokens,
                    "temperature": 0.7,
                },
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
            
            # Validate response structure
            if "choices" not in data or not data["choices"]:
                raise ValueError("Invalid response: no choices field")
            if "message" not in data["choices"][0] or "content" not in data["choices"][0]["message"]:
                raise ValueError("Invalid response: missing message content")
                
            text = data["choices"][0]["message"]["content"]
            
            if not text or not text.strip():
                raise ValueError("Empty response from Groq")
            
            duration_ms = int((time.monotonic() - start_time) * 1000)
            health_monitor.log_success("llm", duration_ms=duration_ms)
            return text

        except requests.exceptions.Timeout as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            error_msg = f"Groq timeout after {duration_ms}ms"
            health_monitor.log_failure("llm", e)
            raise TimeoutError(error_msg) from e
            
        except requests.exceptions.HTTPError as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            if e.response.status_code == 429:
                error_msg = f"Groq rate limit exceeded after {duration_ms}ms"
                health_monitor.log_failure("llm", e)
                raise GroqRateLimitError(error_msg) from e
            elif e.response.status_code == 401:
                error_msg = f"Groq unauthorized after {duration_ms}ms"
                health_monitor.log_failure("llm", e)
                raise RuntimeError(error_msg) from e
            else:
                error_msg = f"Groq HTTP {e.response.status_code} after {duration_ms}ms"
                health_monitor.log_failure("llm", e)
                raise RuntimeError(error_msg) from e
                
        except requests.exceptions.RequestException as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            error_msg = f"Groq request failed after {duration_ms}ms: {str(e)}"
            health_monitor.log_failure("llm", e)
            raise RuntimeError(error_msg) from e
            
        except ValueError as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            error_msg = f"Groq response validation failed after {duration_ms}ms: {str(e)}"
            health_monitor.log_failure("llm", e)
            raise RuntimeError(error_msg) from e
            
        except Exception as e:
            duration_ms = int((time.monotonic() - start_time) * 1000)
            error_msg = f"Groq unexpected error after {duration_ms}ms: {str(e)}"
            health_monitor.log_failure("llm", e)
            raise RuntimeError(error_msg) from e
