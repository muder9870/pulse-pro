import logging
import time
from datetime import datetime
from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository

class HealthMonitor:
    def __init__(self):
        self.logger = logging.getLogger("health_monitor")

    def log_success(self, service_name: str, duration_ms: int = 0):
        """Record a successful heartbeat for a service."""
        try:
            db = SessionLocal()
            try:
                SystemRepository(db).update_health(service_name, "ok", duration_ms=duration_ms)
            finally:
                db.close()
            self.logger.info(f"service={service_name} status=ok duration_ms={duration_ms}")
        except Exception as e:
            self.logger.error(f"failed_to_update_health service={service_name} error={e}")

    def log_failure(self, service_name: str, error: Exception | str, duration_ms: int = 0):
        """Record a failure for a service."""
        error_msg = str(error)
        if isinstance(error, Exception):
            error_msg = f"{type(error).__name__}: {str(error)}"
        
        try:
            db = SessionLocal()
            try:
                SystemRepository(db).update_health(service_name, "error", error_msg, duration_ms=duration_ms)
            finally:
                db.close()
            self.logger.error(f"service={service_name} status=error error={error_msg}")
            
            # Proactive notification for critical services
            self._trigger_alert(service_name, error_msg)
        except Exception as e:
            self.logger.error(f"failed_to_log_failure service={service_name} error={e}")

    def get_failure_rate(self, service_name: str, window: int = 10) -> float:
        """Get the recent failure rate for a service (0.0 to 1.0)."""
        try:
            db = SessionLocal()
            try:
                return SystemRepository(db).get_recent_failure_rate(service_name, window)
            finally:
                db.close()
        except Exception as e:
            self.logger.error(f"failed_to_get_failure_rate service={service_name} error={e}")
            return 0.0

    def _trigger_alert(self, service_name: str, error_msg: str):
        """Send proactive notification for failures."""
        try:
            from backend.notifications import notify_users
            notify_users(
                title=f"🛑 Critical Failure: {service_name}",
                message=f"The service '{service_name}' failed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.\n\nError: {error_msg}",
                level="error"
            )
        except Exception as e:
            self.logger.error(f"failed_to_send_alert service={service_name} error={e}")

# Singleton instance
health_monitor = HealthMonitor()
