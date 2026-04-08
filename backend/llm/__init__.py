from backend.config import settings
from .llm_router import SmartLLMRouter

# Thread-safe singleton for the router
_router = None

def _cache_key(prompt: str, max_tokens: int) -> str:
    content = f"{prompt}:{max_tokens}"
    return hashlib.md5(content.encode()).hexdigest()[:16]

def get_llm_client():
    global _router
    if _router is None:
        _router = SmartLLMRouter()
    return _router

# Compatibility wrapper for existing code that might use the Protocol
class LLMClient:
    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        return get_llm_client().generate(prompt, max_tokens).content
