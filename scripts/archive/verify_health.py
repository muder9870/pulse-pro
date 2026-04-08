from backend.processors.health_monitor import health_monitor
import time

def test_health_reporting():
    print("Testing Health Monitor success reporting...")
    health_monitor.log_success("test:success_service")
    
    print("\nTesting Health Monitor failure reporting and notifications...")
    try:
        raise ValueError("Simulated critical system failure for verification")
    except Exception as e:
        health_monitor.log_failure("test:failure_service", e)
    
    print("\nVerification heartbeats sent. Check the 'Health' tab in the dashboard.")
    print("Also check if a notification was triggered (if configured).")

if __name__ == "__main__":
    test_health_reporting()
