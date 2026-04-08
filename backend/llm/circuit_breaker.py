import logging
import time
from backend.processors.health_monitor import health_monitor
from backend.config import settings

class CircuitBreakerError(RuntimeError):
    pass

class CircuitBreaker:
    def __init__(self, service_name: str):
        self.service_name = service_name
        self.log = logging.getLogger("circuit_breaker")
        self.last_failure_time = 0
        self.cooldown_period = getattr(settings, "CIRCUIT_BREAKER_COOLDOWN", 60) # Default 60s

    def call(self, func, *args, **kwargs):
        fail_rate = health_monitor.get_failure_rate(
            self.service_name, 
            window=getattr(settings, "CIRCUIT_BREAKER_WINDOW", 50)
        )
        threshold = getattr(settings, "CIRCUIT_BREAKER_THRESHOLD", 0.75)
        
        if fail_rate >= threshold:
            # Check cooldown for recovery (Half-Open state)
            now = time.monotonic()
            time_since_failure = now - self.last_failure_time
            
            if time_since_failure < self.cooldown_period:
                wait_remaining = self.cooldown_period - time_since_failure
                msg = (f"Circuit breaker tripped for {self.service_name} "
                       f"(fail_rate={fail_rate:.2f} >= {threshold:.2f}). "
                       f"Cooldown active: {wait_remaining:.1f}s remaining.")
                self.log.warning(msg)
                raise CircuitBreakerError(msg)
            else:
                self.log.info(f"Circuit breaker in Half-Open state for {self.service_name}. Attempting probe call.")
            
        start_time = time.monotonic()
        try:
            result = func(*args, **kwargs)
            duration_ms = int((time.monotonic() - start_time) * 1000)
            self.log.debug(f"Circuit breaker: {self.service_name} success in {duration_ms}ms")
            # On success in half-open or closed, we don't reset history here 
            # (health_monitor handles it), but we could.
            return result
        except TimeoutError as e:
            self.last_failure_time = time.monotonic()
            duration_ms = int((time.monotonic() - start_time) * 1000)
            self.log.warning(f"Circuit breaker: {self.service_name} timeout after {duration_ms}ms: {e}")
            health_monitor.log_failure(self.service_name, e)
            raise e
        except Exception as e:
            self.last_failure_time = time.monotonic()
            duration_ms = int((time.monotonic() - start_time) * 1000)
            self.log.error(f"Circuit breaker: {self.service_name} failed in {duration_ms}ms: {e}")
            health_monitor.log_failure(self.service_name, e)
            raise e
