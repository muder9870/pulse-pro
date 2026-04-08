from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable, Any

from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED, JobExecutionEvent
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.db.session import SessionLocal
from backend.db.repositories.system_repository import SystemRepository

SCHEDULE_PREF_KEY = "pipeline_schedule"

DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]


def _get_pref(key: str) -> str | None:
    db = SessionLocal()
    try:
        repo = SystemRepository(db)
        return repo.get_preference(key)
    finally:
        db.close()


def _set_pref(key: str, value: str) -> None:
    db = SessionLocal()
    try:
        repo = SystemRepository(db)
        repo.set_preference(key, value)
    finally:
        db.close()


def default_schedule() -> dict[str, Any]:
    return {"enabled": True, "days": DAY_ORDER, "time": "11:00"}


def load_schedule() -> dict[str, Any]:
    raw = _get_pref(SCHEDULE_PREF_KEY)
    if not raw:
        return default_schedule()
    try:
        data = json.loads(raw)
        return normalize_schedule(data)
    except Exception:
        return default_schedule()


def normalize_schedule(data: dict[str, Any]) -> dict[str, Any]:
    enabled = bool(data.get("enabled", True))

    days_raw = data.get("days", DAY_ORDER)
    days: list[str] = []
    if isinstance(days_raw, list):
        for d in days_raw:
            if isinstance(d, str) and d.lower() in DAY_ORDER:
                days.append(d.lower())
    if not days:
        days = DAY_ORDER

    time_str = str(data.get("time", "11:00"))
    hour = 11
    minute = 0
    try:
        parts = time_str.strip().split(":")
        if len(parts) == 2:
            hour = int(parts[0])
            minute = int(parts[1])
        hour = max(0, min(hour, 23))
        minute = max(0, min(minute, 59))
    except Exception:
        hour, minute = 11, 0
    time_str = f"{hour:02d}:{minute:02d}"

    return {"enabled": enabled, "days": days, "time": time_str}


def save_schedule(data: dict[str, Any]) -> dict[str, Any]:
    normalized = normalize_schedule(data)
    _set_pref(SCHEDULE_PREF_KEY, json.dumps(normalized))
    return normalized


@dataclass
class SchedulerManager:
    start_pipeline: Callable[[], None]
    update_hashtags: Callable[[], None] | None = None

    def __post_init__(self) -> None:
        self._logger = logging.getLogger("scheduler")
        self._scheduler = BackgroundScheduler()
        self._job_id = "daily_pipeline_job"
        self._hashtag_job_id = "hashtag_update_job"
        self._queue_job_id = "queue_process_job"
        self._schedule = load_schedule()
        self._last_triggered_at: str | None = None
        self._last_trigger_status: str | None = None
        self._last_trigger_error: str | None = None

        self._scheduler.add_listener(self._on_job_event, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    def _on_job_event(self, event: JobExecutionEvent) -> None:
        if event.job_id != self._job_id:
            return
        self._last_triggered_at = datetime.now(timezone.utc).isoformat()
        if event.exception:
            self._last_trigger_status = "error"
            self._last_trigger_error = str(event.exception)
            self._logger.error("job_event status=error error=%s", self._last_trigger_error)
        else:
            self._last_trigger_status = "ok"
            self._last_trigger_error = None
            self._logger.info("job_event status=ok")

    def start(self) -> None:
        if not self._scheduler.running:
            self._scheduler.start()
        self.apply(self._schedule)

    def shutdown(self) -> None:
        if self._scheduler.running:
            self._scheduler.shutdown(wait=False)

    def apply(self, schedule: dict[str, Any]) -> None:
        schedule = normalize_schedule(schedule)
        self._schedule = schedule

        existing = self._scheduler.get_job(self._job_id)
        if existing:
            self._scheduler.remove_job(self._job_id)

        if not schedule["enabled"]:
            self._logger.info("schedule_applied enabled=false")
        else:
            hour, minute = [int(p) for p in str(schedule["time"]).split(":")]
            days = ",".join(schedule["days"])
            trigger = CronTrigger(day_of_week=days, hour=hour, minute=minute)
            self._scheduler.add_job(
                self._job_wrapper,
                trigger=trigger,
                id=self._job_id,
                replace_existing=True,
                max_instances=1,       # Never run two pipeline jobs at once
                misfire_grace_time=300,  # If missed, skip rather than catch up
            )
            self._logger.info("schedule_applied enabled=true days=%s time=%s", days, schedule["time"])

        existing_hashtags = self._scheduler.get_job(self._hashtag_job_id)
        if existing_hashtags:
            self._scheduler.remove_job(self._hashtag_job_id)

        if self.update_hashtags is not None:
            trigger = CronTrigger(minute=5)
            self._scheduler.add_job(
                self._hashtag_wrapper,
                trigger=trigger,
                id=self._hashtag_job_id,
                replace_existing=True,
                max_instances=1,
                misfire_grace_time=120,
            )
            self._logger.info("hashtag_schedule_applied enabled=true")

        # Phase 2.1: Queue processor (every 5 minutes to reduce load)
        trigger = CronTrigger(minute='*/5') # Every 5 minutes
        self._scheduler.add_job(
            self._queue_wrapper,
            trigger=trigger,
            id=self._queue_job_id,
            replace_existing=True,
            max_instances=1,       # Prevent queued publish jobs from piling up
            misfire_grace_time=60,
        )
        self._logger.info("queue_schedule_applied enabled=true interval=5min")

    def _job_wrapper(self) -> None:
        self._logger.info("job_triggered")
        self.start_pipeline()

    def _hashtag_wrapper(self) -> None:
        if self.update_hashtags is None:
            return
        self._logger.info("hashtag_job_triggered")
        self.update_hashtags()

    def _queue_wrapper(self) -> None:
        try:
            from backend.processors.scheduling_engine import scheduling_engine
            scheduling_engine.process_queue()
        except Exception as e:
            self._logger.error(f"Error in queue_wrapper: {e}")

    def update(self, schedule: dict[str, Any]) -> dict[str, Any]:
        normalized = save_schedule(schedule)
        self.apply(normalized)
        return normalized

    def get_info(self) -> dict[str, Any]:
        job = self._scheduler.get_job(self._job_id)
        next_run = job.next_run_time if job else None
        if next_run is not None and next_run.tzinfo is None:
            next_run = next_run.replace(tzinfo=timezone.utc)

        return {
            "schedule": self._schedule,
            "next_run_time": next_run.astimezone(timezone.utc).isoformat() if next_run else None,
            "server_time": datetime.now(timezone.utc).isoformat(),
            "last_triggered_at": self._last_triggered_at,
            "last_trigger_status": self._last_trigger_status,
            "last_trigger_error": self._last_trigger_error,
        }


def _sleep_forever() -> None:
    while True:
        time.sleep(60)
