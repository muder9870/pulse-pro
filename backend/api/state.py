import threading

pipeline_lock = threading.RLock()
pipeline_state = {
    "running": False,
    "last_started_at": None,
    "last_finished_at": None,
    "last_error": None,
    "last_result": None,
    "partial_success": False,
}

# Scheduler manager will be initialized in main.py but can be accessed via current_app or local import if needed.
# For now, we keep the state simple.
