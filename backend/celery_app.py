import os

from celery import Celery
from backend.config import settings

celery_app = Celery(
    'pulse_pro',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=['backend.tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    # Reliability settings
    task_acks_late=True,  # Acknowledge after task completion
    worker_prefetch_multiplier=1,  # Prefetch one task at a time
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    task_default_retry_delay=60,  # Base retry delay
    task_default_max_retries=3,
    # Visibility timeout for long-running tasks
    broker_transport_options={'visibility_timeout': 7200},  # 2 hours
    task_default_rate_limit='10/m',
    # Dead-letter queue
    task_reject_on_worker_lost=True,
    task_routes={
        'backend.tasks.process_article': {'queue': 'article_processing'},
        'backend.tasks.generate_content': {'queue': 'content_generation'},
    },
    task_default_queue='default',
    task_default_exchange='default',
    task_default_routing_key='default',
)

# Tests and local scripts: run tasks inline so analysis → scoring can run in one process.
if os.getenv("CELERY_TASK_ALWAYS_EAGER", "").lower() in {"1", "true", "yes"}:
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True