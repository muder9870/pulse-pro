import logging
import time
from enum import Enum
from typing import List, Dict, Optional
from .clients.groq_client import GroqClient, GroqRateLimitError
from .clients.ollama_client import LocalOllamaClient
from .clients.paid_client import PaidApiLLMClient
from .clients.cerebras_client import CerebrasClient
from .clients.openrouter_client import OpenRouterClient
from .circuit_breaker import CircuitBreaker
from backend.config import settings
import hashlib
import redis
from pybreaker import CircuitBreaker as PyBreaker

class Task(Enum):
    ANALYSIS = "analysis"
    TAGGING = "tagging"
    SOCIAL_SHORT = "social_short"  # Twitter, Threads
    SOCIAL_LONG = "social_long"    # LinkedIn, Blog, YouTube
    VIDEO_SCRIPT = "video_script"
    RESEARCH = "research"
    DEEP_ANALYSIS = "deep_analysis"
    DECISION = "decision"

# Task-specific routing with fallback chains
TASK_ROUTING: Dict[Task, List[str]] = {
    Task.ANALYSIS: ["cerebras", "groq", "openrouter"],
    Task.TAGGING: ["cerebras", "groq", "openrouter"],
    Task.SOCIAL_SHORT: ["groq", "cerebras", "openrouter"],
    Task.SOCIAL_LONG: ["groq", "cerebras", "openrouter"],
    Task.VIDEO_SCRIPT: ["groq", "cerebras", "openrouter"],
    Task.RESEARCH: ["openrouter", "groq", "cerebras"],
    Task.DEEP_ANALYSIS: ["openrouter", "groq", "cerebras"],
    Task.DECISION: ["groq", "cerebras", "openrouter"]
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
            "openrouter": OpenRouterClient
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
        cache_key = hashlib.md5(f"{task.value}:{prompt}".encode()).hexdigest()
        if self.cache:
            cached = self.cache.get(cache_key)
            if cached:
                # Update access count for adaptive TTL
                access_key = f"access:{cache_key}"
                access_count = self.cache.incr(access_key)
                ttl = min(86400, 3600 * (1 + access_count))
                self.cache.expire(cache_key, ttl)
                self.log.info(f"CACHE HIT redis key={cache_key[:8]}...")
                return LLMResponse(content=cached.decode(), provider="redis_cache")
                
        # Check SQLite (fallback)
        from backend.db.session import SessionLocal
        from backend.db.models import LLMCache
        db = SessionLocal()
        try:
            sqlite_cached = db.query(LLMCache).filter_by(prompt_hash=cache_key).first()
            if sqlite_cached:
                self.log.info(f"CACHE HIT sqlite key={cache_key[:8]}...")
                # Reload into Redis
                if self.cache:
                    self.cache.set(cache_key, sqlite_cached.response, ex=1800)
                return LLMResponse(content=sqlite_cached.response, provider="sqlite_cache")
        except Exception as e:
            self.log.error(f"SQLite cache check failed: {e}")
        finally:
            db.close()
            
        self.log.info(f"CACHE MISS key={cache_key[:8]}... calling LLM")
        
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
                    
                # Store in SQLite
                db_write = SessionLocal()
                try:
                    existing = db_write.query(LLMCache).filter_by(prompt_hash=cache_key).first()
                    if not existing:
                        db_write.add(LLMCache(
                            prompt_hash=cache_key,
                            response=result
                        ))
                        db_write.commit()
                except Exception as e:
                    db_write.rollback()
                    self.log.error(f"Failed to write to sqlite cache: {e}")
                finally:
                    db_write.close()
                
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
        
        if len(prompt) > 50000:  # Reasonable limit
            raise ValueError(f"Prompt too long: {len(prompt)} chars (max 50000)")
        
        if max_tokens < 1 or max_tokens > 8000:
            raise ValueError(f"Invalid max_tokens: {max_tokens} (must be 1-8000)")
    
    def _call_with_timeout(self, func, *args, timeout: int = 10, **kwargs):
        """Wrap function call with timeout."""
        import threading
        import queue
        
        result_queue = queue.Queue()
        exception_queue = queue.Queue()
        
        def target():
            try:
                result = func(*args, **kwargs)
                result_queue.put(result)
            except Exception as e:
                exception_queue.put(e)
        
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout)
        
        if thread.is_alive():
            raise TimeoutError(f"LLM call timed out after {timeout}s")
        
        if not exception_queue.empty():
            raise exception_queue.get()
        
        if not result_queue.empty():
            return result_queue.get()
        
        raise RuntimeError("Unexpected timeout condition")
    
    def route(self, task: str, prompt: str, max_tokens: int = 512) -> str:
        """Legacy method for backward compatibility."""
        try:
            task_enum = Task(task.lower())
        except ValueError:
            self.log.warning(f"Unknown task {task}, using SOCIAL_SHORT")
            task_enum = Task.SOCIAL_SHORT
        
        return self.generate(prompt, max_tokens, task_enum).content
    
    def get_status(self) -> Dict:
        """Get current router status for debugging."""
        status = {
            "initialized_clients": list(self.clients.keys()),
            "available_providers": [],
            "failed_providers": []
        }
        
        for provider, client in self.clients.items():
            try:
                # Simple health check - try to initialize or validate client
                if hasattr(client, 'model') or hasattr(client, 'config'):
                    status["available_providers"].append(provider)
                else:
                    status["failed_providers"].append(provider)
            except Exception:
                status["failed_providers"].append(provider)
        
        return status

# Global instance
smart_router = SmartLLMRouter()
