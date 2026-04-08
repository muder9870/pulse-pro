"""
Retry utility with exponential backoff for external API calls.

Provides decorators and functions to add resilience to external API calls
with configurable retry logic, exponential backoff, and circuit breaker pattern.
"""

import logging
import time
import functools
from typing import Callable, TypeVar, ParamSpec, Any

log = logging.getLogger("retry_utils")

P = ParamSpec("P")
T = TypeVar("T")


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    backoff_factor: float = 2.0,
    exceptions: tuple = (Exception,)
):
    """
    Decorator to retry a function with exponential backoff.
    
    Args:
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds before first retry
        backoff_factor: Multiplier for delay between retries
        exceptions: Tuple of exception types to catch and retry
    
    Example:
        @retry_with_backoff(max_retries=3, initial_delay=1.0)
        def fetch_data():
            return requests.get("https://api.example.com/data")
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    if attempt < max_retries:
                        log.warning(
                            f"Attempt {attempt + 1}/{max_retries} failed for {func.__name__}: {e}. "
                            f"Retrying in {delay}s..."
                        )
                        time.sleep(delay)
                        delay *= backoff_factor
                    else:
                        log.error(
                            f"All {max_retries} retry attempts failed for {func.__name__}: {e}"
                        )
            
            # If we get here, all retries failed
            raise last_exception  # type: ignore
        
        return wrapper
    return decorator


class CircuitBreaker:
    """
    Circuit breaker pattern to prevent cascading failures.
    
    States:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, requests fail immediately
    - HALF_OPEN: Testing if service recovered
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: float = 60.0,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self.failure_count = 0
        self.last_failure_time: float | None = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func: Callable[P, T], *args: P.args, **kwargs: P.kwargs) -> T:
        """Execute function with circuit breaker protection."""
        if self.state == "OPEN":
            if self.last_failure_time and (time.time() - self.last_failure_time) > self.recovery_timeout:
                self.state = "HALF_OPEN"
                log.info(f"Circuit breaker for {func.__name__} entering HALF_OPEN state")
            else:
                raise Exception(f"Circuit breaker OPEN for {func.__name__}")
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        """Reset circuit breaker on successful call."""
        self.failure_count = 0
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            log.info("Circuit breaker recovered, state: CLOSED")
    
    def _on_failure(self):
        """Record failure and potentially open circuit."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            log.error(
                f"Circuit breaker OPEN after {self.failure_count} failures. "
                f"Will retry after {self.recovery_timeout}s"
            )


def circuit_breaker_decorator(
    failure_threshold: int = 5,
    recovery_timeout: float = 60.0
):
    """
    Decorator to add circuit breaker pattern to a function.
    
    Example:
        @circuit_breaker_decorator(failure_threshold=3, recovery_timeout=30)
        def call_external_api():
            return requests.get("https://api.example.com")
    """
    breaker = CircuitBreaker(failure_threshold, recovery_timeout)
    
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @functools.wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            return breaker.call(func, *args, **kwargs)
        return wrapper
    return decorator
