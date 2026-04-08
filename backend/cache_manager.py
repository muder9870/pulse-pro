"""
Cache Manager with LRU eviction and TTL support.

Provides in-memory caching for frequently accessed data with:
- LRU (Least Recently Used) eviction policy
- TTL (Time To Live) expiration
- Configurable max size
- Cache statistics tracking
- Decorator for easy function caching
"""

import time
import hashlib
import json
import functools
import logging
from typing import Any, Callable, TypeVar, ParamSpec
from collections import OrderedDict
from threading import Lock

log = logging.getLogger("cache_manager")

P = ParamSpec("P")
T = TypeVar("T")


class CacheEntry:
    """Single cache entry with value and expiration."""
    
    def __init__(self, value: Any, ttl: int):
        self.value = value
        self.created_at = time.time()
        self.ttl = ttl
        self.hit_count = 0
    
    def is_expired(self) -> bool:
        """Check if entry has expired."""
        if self.ttl <= 0:
            return False  # No expiration
        return (time.time() - self.created_at) > self.ttl
    
    def touch(self):
        """Record a cache hit."""
        self.hit_count += 1


class CacheManager:
    """
    Thread-safe LRU cache with TTL support.
    
    Features:
    - LRU eviction when max_size is reached
    - Automatic expiration based on TTL
    - Thread-safe operations
    - Cache statistics
    """
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        """
        Initialize cache manager.
        
        Args:
            max_size: Maximum number of entries (default: 1000)
            default_ttl: Default TTL in seconds (default: 300 = 5 minutes)
        """
        self.max_size = max_size
        self.default_ttl = default_ttl
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = Lock()
        
        # Statistics
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.expirations = 0
    
    def get(self, key: str) -> Any | None:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key not in self._cache:
                self.misses += 1
                return None
            
            entry = self._cache[key]
            
            # Check expiration
            if entry.is_expired():
                del self._cache[key]
                self.expirations += 1
                self.misses += 1
                log.debug(f"Cache expired: {key}")
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            entry.touch()
            self.hits += 1
            
            log.debug(f"Cache hit: {key}")
            return entry.value
    
    def set(self, key: str, value: Any, ttl: int | None = None):
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None = use default)
        """
        with self._lock:
            if ttl is None:
                ttl = self.default_ttl
            
            # Remove if exists (to update position)
            if key in self._cache:
                del self._cache[key]
            
            # Add new entry
            self._cache[key] = CacheEntry(value, ttl)
            self._cache.move_to_end(key)
            
            # Evict oldest if over max_size
            while len(self._cache) > self.max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
                self.evictions += 1
                log.debug(f"Cache evicted (LRU): {oldest_key}")
            
            log.debug(f"Cache set: {key} (ttl={ttl}s)")
    
    def delete(self, key: str):
        """Delete entry from cache."""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                log.debug(f"Cache deleted: {key}")
    
    def clear(self):
        """Clear all cache entries."""
        with self._lock:
            self._cache.clear()
            log.info("Cache cleared")
    
    def invalidate_prefix(self, prefix: str):
        """Invalidate all keys starting with prefix."""
        with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
            for key in keys_to_delete:
                del self._cache[key]
            log.info(f"Invalidated {len(keys_to_delete)} keys with prefix: {prefix}")
    
    def stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests) if total_requests > 0 else 0.0
            
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hits": self.hits,
                "misses": self.misses,
                "hit_rate": round(hit_rate, 3),
                "evictions": self.evictions,
                "expirations": self.expirations,
                "total_requests": total_requests
            }
    
    def cleanup_expired(self):
        """Remove all expired entries."""
        with self._lock:
            expired_keys = [k for k, v in self._cache.items() if v.is_expired()]
            for key in expired_keys:
                del self._cache[key]
                self.expirations += 1
            
            if expired_keys:
                log.info(f"Cleaned up {len(expired_keys)} expired entries")


# Global cache instance
_global_cache = CacheManager(max_size=1000, default_ttl=300)


def get_cache() -> CacheManager:
    """Get global cache instance."""
    return _global_cache


def cache_key(*args, **kwargs) -> str:
    """
    Generate cache key from function arguments.
    
    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments
        
    Returns:
        SHA256 hash of serialized arguments
    """
    # Serialize arguments
    key_data = {
        "args": args,
        "kwargs": kwargs
    }
    key_str = json.dumps(key_data, sort_keys=True, default=str)
    
    # Hash for consistent key
    return hashlib.sha256(key_str.encode()).hexdigest()[:16]


def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results.
    
    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        
    Example:
        @cache_result(ttl=300, key_prefix="stories")
        def get_top_stories(limit=10):
            return expensive_database_query()
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            cache = get_cache()
            
            # Generate cache key
            arg_key = cache_key(*args, **kwargs)
            full_key = f"{key_prefix}:{func.__name__}:{arg_key}"
            
            # Try to get from cache
            cached_value = cache.get(full_key)
            if cached_value is not None:
                return cached_value
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache.set(full_key, result, ttl=ttl)
            
            return result
        
        return wrapper
    return decorator


def invalidate_cache(key_prefix: str):
    """
    Invalidate all cache entries with given prefix.
    
    Args:
        key_prefix: Prefix to invalidate
        
    Example:
        invalidate_cache("stories")  # Clear all stories cache
    """
    cache = get_cache()
    cache.invalidate_prefix(key_prefix)
