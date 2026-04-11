import logging
import time
import concurrent.futures
from enum import Enum
from typing import List, Dict, Optional
from .clients.groq_client import GroqClient, GroqRateLimitError
from .clients.ollama_client import LocalOllamaClient
from .clients.paid_client import PaidApiLLMClient
from .clients.cerebras_client import CerebrasClient
from .clients.openrouter_client import OpenRouterClient
from .clients.gemini_client import GeminiClient
from .clients.mistral_client import MistralClient
from .clients.pollinations_text_client import PollinationsTextClient
from .circuit_breaker import CircuitBreaker
from backend.config import settings
import hashlib
import redis
from pybreaker import CircuitBreaker as PyBreaker

class Task(Enum):
    ANALYSIS = "analysis"
    TAGGING = "tagging"
    SOCIAL_SHORT = "social_short"
    SOCIAL_LONG = "social_long"
    VIDEO_SCRIPT = "video_script"
    RESEARCH = "research"
    DEEP_ANALYSIS = "deep_analysis"
    DECISION = "decision"
    BLOG = "blog"
    AUDIO_SCRIPT = "audio_script"

# Task-specific routing with fallback chains
TASK_ROUTING: Dict[Task, List[str]] = {
    Task.ANALYSIS:      ["cerebras", "groq", "gemini", "openrouter", "mistral", "pollinations_text"],
    Task.TAGGING:       ["cerebras", "groq", "gemini", "openrouter", "mistral", "pollinations_text"],
    Task.SOCIAL_SHORT:  ["groq", "cerebras", "gemini", "openrouter", "mistral", "pollinations_text"],
    Task.SOCIAL_LONG:   ["groq", "cerebras", "gemini", "openrouter", "mistral"],
    Task.VIDEO_SCRIPT:  ["groq", "cerebras", "gemini", "openrouter", "mistral"],
    Task.RESEARCH:      ["openrouter", "gemini", "groq", "cerebras", "mistral"],
    Task.DEEP_ANALYSIS: ["openrouter", "gemini", "groq", "cerebras"],
    Task.DECISION:      ["groq", "cerebras", "gemini", "openrouter", "mistral"],
    Task.BLOG:          ["openrouter", "gemini", "groq", "cerebras", "mistral"],
    Task.AUDIO_SCRIPT:  ["groq", "cerebras", "gemini", "openrouter", "mistral"],
}

# Response format for consistency
class LLMResponse:
    def __init__(self, content: str, provider: str, status: str = "success", error: str = None):
        self.content = content or ""
        self.provider = provider
        self.status = status
        self.error = error
    
    def to_dict(self) -> Dict:
        return {
            "content": self.content,
            "provider": self.provider,
            "status": self.status,
            "error": self.error
        }

    def __str__(self) -> str:
        return self.content

    def __len__(self) -> int:
        return len(self.content)
    
    def __getitem__(self, key):
        return self.content[key]

    def strip(self, *args, **kwargs):
        return self.content.strip(*args, **kwargs)

    def lower(self):
        return self.content.lower()

    def replace(self, *args, **kwargs):
        return self.content.replace(*args, **kwargs)

    def find(self, *args, **kwargs):
        return self.content.find(*args, **kwargs)

    def rfind(self, *args, **kwargs):
        return self.content.rfind(*args, **kwargs)

class SmartLLMRouter:
    def __init__(self):
        self.log = logging.getLogger("llm_router")
        self.circuit_breakers = {}
        self.cache = redis.Redis.from_url(settings.REDIS_URL) if hasattr(settings, 'REDIS_URL') else None
        self.clients = {}
        self._initialize_clients()

    def _initialize_clients(self):
        """Initialize all available clients with circuit breakers."""
        client_configs = {
            "groq": GroqClient,
            "local": LocalOllamaClient,
            "paid_api": PaidApiLLMClient,
            "cerebras": CerebrasClient,
            "openrouter": OpenRouterClient,
            "gemini": GeminiClient,
            "mistral": MistralClient,
            "pollinations_text": PollinationsTextClient,
        }
        
        for name, client_class in client_configs.items():
            try:
                self.clients[name] = client_class()
                self.circuit_breakers[name] = CircuitBreaker(f"llm_{name}")
                self.log.info(f"Initialized LLM client: {name}")
            except Exception as e:
                self.log.warning(f"Failed to initialize {name}: {e}")

    def generate(self, prompt: str, max_tokens: int = 512, task: Task = Task.SOCIAL_SHORT, timeout: int = 10) -> LLMResponse:
        """
        Generate response with task-aware routing and automatic fallback.
        Always returns LLMResponse so callers can use .content and .provider consistently.
        """
        # Validate inputs
        self._validate_inputs(prompt, max_tokens)
        
        # Check cache first
        cache_key = hashlib.md5(f"{task.value}:{max_tokens}:{prompt}".encode()).hexdigest()
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                # Update access count for adaptive TTL
                access_key = f"access:{cache_key}"
                access_count = self.cache.incr(access_key)
                ttl = min(86400, 3600 * (1 + access_count))
                self.cache.expire(cache_key, ttl)
                return LLMResponse(content=cached.decode(), provider="redis_cache")
        
        provider_chain = TASK_ROUTING.get(task, ["groq", "cerebras", "openrouter"])
        self.log.info(f"Starting generation for task {task.value}, prompt length: {len(prompt)} chars")
        self.log.debug(f"Prompt preview: {prompt[:200]}...")
        
        errors = []
        
        for provider in provider_chain:
            if provider not in self.clients:
                error_msg = f"Provider {provider} not initialized"
                self.log.warning(error_msg)
                errors.append(error_msg)
                continue
                
            start_time = time.monotonic()
            try:
                self.log.info(f"Trying {provider} for task {task.value}")
                
                # Add timeout wrapper
                result = self._call_with_timeout(
                    self.circuit_breakers[provider].call,
                    self.clients[provider].generate,
                    prompt, max_tokens=max_tokens,
                    timeout=timeout
                )
                
                duration = time.monotonic() - start_time
                self.log.info(f"Success with {provider} for task {task.value} in {duration:.2f}s")
                
                # Cache the result
                if self.cache:
                    access_count = self.cache.incr(f"access:{cache_key}")
                    ttl = min(86400, 3600 * (1 + access_count))
                    self.cache.setex(cache_key, ttl, result)
                
                return LLMResponse(content=result, provider=provider)
                
            except Exception as e:
                duration = time.monotonic() - start_time
                error_msg = f"{provider} failed for task {task.value} in {duration:.2f}s: {str(e)}"
                self.log.warning(error_msg)
                errors.append(error_msg)
                continue
        
        # All providers failed - Try local Ollama as last resort before giving up
        if "local" in self.clients and "local" not in provider_chain:
            try:
                self.log.info(f"All preferred providers failed. Trying local Ollama as last resort for task {task.value}")
                result = self._call_with_timeout(
                    self.circuit_breakers["local"].call,
                    self.clients["local"].generate,
                    prompt, max_tokens=max_tokens,
                    timeout=timeout
                )
                return LLMResponse(content=result, provider="local_fallback")
            except Exception as e:
                self.log.error(f"Local Ollama fallback also failed: {e}")
        
        # Still failing? Return a very basic fallback string instead of crashing the pipeline
        if task in (Task.ANALYSIS, Task.TAGGING, Task.RESEARCH, Task.DEEP_ANALYSIS):
            # For analysis, we need valid JSON. We return a string that can be parsed.
            fallback_json = '{"summary": "Analysis failed due to LLM unavailability.", "viral_hook": "Tech update.", "key_innovation": "N/A", "implication": "N/A", "key_takeaways": ["Service currently unavailable"], "category": "Other", "sentiment": "Neutral", "tags": ["system"]}'
            
            # Tailor fallback for specific analysis tasks
            if task == Task.DEEP_ANALYSIS:
                fallback_json = '{"methodology": "N/A", "limitations": "N/A", "results": "N/A", "authors": ["N/A"], "affiliations": "N/A"}'
            elif task == Task.RESEARCH:
                fallback_json = '{"relevance": 0, "impact": 0, "summary": "N/A"}'
                
            return LLMResponse(content=fallback_json, provider="system_fallback", status="error")
        
        final_error = f"All LLM providers failed for task {task.value}. Errors: {'; '.join(errors)}"
        self.log.error(final_error)
        
        if task == Task.SOCIAL_SHORT:
            return LLMResponse(
                content="Content generation unavailable at the moment.",
                provider="system_fallback",
                status="error",
            )
        return LLMResponse(content="Content generation unavailable.", provider="system_fallback", status="error")

    def _validate_inputs(self, prompt: str, max_tokens: int):
        """Validate input parameters."""
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        if len(prompt) > 50000:
            raise ValueError(f"Prompt too long: {len(prompt)} chars (max 50000)")
        if max_tokens < 1 or max_tokens > 32000:
            raise ValueError(f"Invalid max_tokens: {max_tokens} (must be 1-32000)")
    
    def _call_with_timeout(self, func, *args, timeout: int = 10, **kwargs):
        """Wrap function call with timeout using ThreadPoolExecutor — no thread leaks."""
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(func, *args, **kwargs)
            return future.result(timeout=timeout)
    
    def route(self, task: str, prompt: str, max_tokens: int = 512) -> str:
        """Legacy method for backward compatibility."""
        try:
            task_enum = Task(task.lower())
        except ValueError:
            self.log.warning(f"Unknown task {task}, using SOCIAL_SHORT")
            task_enum = Task.SOCIAL_SHORT
        
        return self.generate(prompt, max_tokens, task_enum).content
    
    def get_status(self) -> Dict:
        """Get current router status — checks actual key configuration."""
        key_map = {
            "groq": getattr(settings, "GROQ_API_KEY", None),
            "local": True,  # Ollama needs no key
            "paid_api": getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "ANTHROPIC_API_KEY", None),
            "cerebras": getattr(settings, "CEREBRAS_API_KEY", None),
            "openrouter": getattr(settings, "OPENROUTER_API_KEY", None),
        }
        status = {
            "initialized_clients": list(self.clients.keys()),
            "providers": [],
        }
        for provider in self.clients:
            key_set = bool(key_map.get(provider))
            cb = self.circuit_breakers.get(provider)
            from backend.processors.health_monitor import health_monitor
            fail_rate = health_monitor.get_failure_rate(f"llm_{provider}", window=10)
            threshold = getattr(settings, "CIRCUIT_BREAKER_THRESHOLD", 0.75)
            status["providers"].append({
                "name": provider,
                "key_configured": key_set,
                "circuit_breaker": "open" if fail_rate >= threshold else "closed",
                "failure_rate": round(fail_rate, 3),
            })
        return status

# Global instance
smart_router = SmartLLMRouter()
