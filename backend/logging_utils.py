from __future__ import annotations

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path


# Loggers that produce internal noise irrelevant to business operations
_SUPPRESSED_LOGGERS = [
    "apscheduler.executors.default",
    "apscheduler.scheduler",
    "apscheduler.jobstores",
    "werkzeug",
    "urllib3.connectionpool",
    "urllib3.util.retry",
    "httpx",
    "httpcore",
    "celery.app.trace",
    "celery.worker.strategy",
    "celery.worker.consumer",
    "celery.worker.consumer.connection",
    "celery.worker.consumer.mingle",
    "celery.worker.consumer.gossip",
    "celery.worker.consumer.heart",
    "celery.worker.autoscale",
    "celery.bootsteps",
    "celery.utils.functional",
    "amqp",
    "kombu",
    "kombu.transport",
    "kombu.transport.redis",
    "kombu.mixins",
    "sqlalchemy.engine",
    "sqlalchemy.pool",
    "sqlalchemy.dialects",
    "alembic.runtime.migration",
    "alembic.env",
    "flasgger",
    "swagger_ui",
    "circuit_breaker",       # internal LLM routing detail
    "llm_router",            # internal LLM routing detail — surfaced via pipeline log
    "health_monitor",        # internal metric — surfaced via system health endpoint
]

# Loggers to keep at WARNING only (reduce INFO noise)
_WARNING_ONLY_LOGGERS = [
    "backend.llm.clients",
    "backend.llm",
    "rss_fetcher",
    "backend.fetchers",
]


class _BusinessFormatter(logging.Formatter):
    """
    Clean, human-readable log format for business operations.

    Format: LEVEL  [component]  message
    Example:
      INFO   [pipeline]    ✓ Pipeline completed in 373s — 50 analyzed, 47 generated
      WARNING [llm]        Groq rate limited — falling back to Cerebras
      ERROR  [analyzer]   Article 978 not found — skipped
    """

    LEVEL_LABELS = {
        logging.DEBUG:    "DEBUG  ",
        logging.INFO:     "INFO   ",
        logging.WARNING:  "WARNING",
        logging.ERROR:    "ERROR  ",
        logging.CRITICAL: "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        level = self.LEVEL_LABELS.get(record.levelno, record.levelname)
        # Shorten logger name: backend.agents.orchestrator → orchestrator
        name = record.name.split(".")[-1] if "." in record.name else record.name
        name = name[:20].ljust(20)
        ts = self.formatTime(record, "%H:%M:%S")
        msg = record.getMessage()
        if record.exc_info:
            msg += "\n" + self.formatException(record.exc_info)
        return f"{ts}  {level}  [{name}]  {msg}"


def init_logging(log_dir: str | Path = "logs", filename: str = "app.log") -> None:
    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    if getattr(root, "_ai_pulse_logging_initialized", False):
        return

    root.setLevel(logging.DEBUG)  # Root captures everything; handlers filter

    business_fmt = _BusinessFormatter()
    verbose_fmt = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # ── Console: clean business format, INFO+ only ────────────────────────────
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setLevel(logging.INFO)
    stream_handler.setFormatter(business_fmt)

    # ── File: verbose format, DEBUG+ for debugging ────────────────────────────
    file_handler = RotatingFileHandler(
        log_path / filename,
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(verbose_fmt)

    root.addHandler(stream_handler)
    root.addHandler(file_handler)

    # Suppress noisy internal loggers on console
    for name in _SUPPRESSED_LOGGERS:
        lg = logging.getLogger(name)
        lg.setLevel(logging.WARNING)
        lg.propagate = True  # Still goes to file

    # Reduce INFO noise from certain loggers
    for name in _WARNING_ONLY_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)

    root._ai_pulse_logging_initialized = True  # type: ignore[attr-defined]
