from backend.celery_app import celery_app
from backend.processors.analyzer import ArticleAnalyzer
from backend.generators.generator_v5 import ContentGenerator
from backend.db.session import get_session, get_db_health, SessionLocal
from backend.models import RawArticle
from backend.config import settings
import logging
import json
import os

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3, acks_late=True)
def process_article(self, article_id: int, correlation_id: str):
    """Process a single article through analysis stage with production-grade atomic idempotency."""
    
    # ADD THIS AT VERY START
    if not get_db_health():
        raise self.retry(countdown=2 ** self.request.retries)

    # UNIFIED REDIS CLIENT - uses REDIS_URL from settings (includes password)
    import redis as redis_lib
    redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)
    
    # PRODUCTION-GRADE ATOMIC LOCK
    idempotency_key = f"process_article:{article_id}"
    
    # STEP 1: Check for existing completed result (crash safety)
    existing_result = redis_client.get(idempotency_key)
    if existing_result:
        result = existing_result.decode() if isinstance(existing_result, bytes) else existing_result
        if result == "completed":
            # Return cached result to prevent reprocessing
            logger.info(json.dumps({
                "correlation_id": correlation_id,
                "article_id": article_id,
                "stage": "analysis",
                "action": "idempotent_skip",
                "reason": "already_completed"
            }))
            return
        elif result in ["processing", "failed"]:
            # Another worker is processing or it failed - skip
            logger.info(json.dumps({
                "correlation_id": correlation_id,
                "article_id": article_id,
                "stage": "analysis",
                "action": "idempotent_skip",
                "reason": f"state_{result}"
            }))
            return
    
    # STEP 2: Acquire atomic lock (SET NX EX)
    lock_acquired = redis_client.set(
        idempotency_key,
        "processing",
        nx=True,  # Only set if not exists
        ex=3600   # 1 hour TTL prevents stale locks
    )
    
    # STEP 3: CRITICAL - Check if lock was actually acquired
    if lock_acquired is None:
        # Lock not acquired - another worker is processing
        logger.info(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "analysis",
            "action": "idempotent_skip",
            "reason": "lock_not_acquired"
        }))
        return
    
    try:
        logger.info(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "analysis",
            "action": "start",
            "retry_count": self.request.retries
        }))
        
        # GLOBAL COST ENFORCEMENT (Redis-based)
        cost_key = "llm_daily_cost"
        daily_budget = float(os.getenv('LLM_DAILY_BUDGET', '100.0'))
        current_cost = redis_client.get(cost_key) or 0
        
        try:
            current_cost = float(current_cost)
        except (ValueError, TypeError):
            current_cost = 0.0
        
        if current_cost > daily_budget:
            raise Exception(f"Global budget exceeded: {current_cost} > {daily_budget}")
        
        # STEP 4: Atomic state transition in separate transaction
        with get_session() as session:
            raw = session.get(RawArticle, article_id)
            if raw and raw.state in ['analyzed', 'generated', 'published']:
                logger.info(json.dumps({
                    "correlation_id": correlation_id,
                    "article_id": article_id,
                    "stage": "analysis",
                    "action": "idempotent_skip",
                    "reason": f"state_{raw.state}"
                }))
                # Mark as completed in Redis for consistency
                redis_client.setex(idempotency_key, 3600, "completed")
                return
            
            raw.state = 'analyzing'  # Only change state here
            session.commit()
        
        # STEP 5: LLM processing outside transaction (to avoid long-running transactions)
        analyzer = ArticleAnalyzer()
        processed_id = analyzer.process_single_article(article_id)
        
        # STEP 6: Update final state in separate transaction
        with get_session() as session:
            raw = session.get(RawArticle, article_id)
            raw.state = 'analyzed'
            session.commit()
        
        # STEP 7: Store result and mark completed
        if processed_id:
            # Store result for crash recovery
            redis_client.setex(f"result:{article_id}", 3600, str(processed_id))
            # NOTE: Content generation is now user-triggered via POST /api/generate
            # The pipeline stops after analysis+scoring (pipeline-content-decoupling spec)
        
        # STEP 8: Mark as completed in Redis
        redis_client.setex(idempotency_key, 3600, "completed")
        
        logger.info(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "analysis",
            "action": "complete",
            "result": "success",
            "processed_id": processed_id
        }))
        
    except Exception as exc:
        # STEP 9: Mark as failed in Redis to allow retries
        redis_client.setex(idempotency_key, 300, "failed")  # 5 min TTL for failed state
        
        # Clean up partial DB state
        with get_session() as session:
            raw = session.get(RawArticle, article_id)
            if raw and raw.state == 'analyzing':
                raw.state = 'analysis_failed'
                session.commit()
        
        logger.error(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "analysis",
            "action": "error",
            "error": str(exc),
            "retry_count": self.request.retries
        }))
        
        # STEP 10: RETRY WITH JITTER (anti-thundering herd)
        if self.request.retries < 3:
            import random
            base_delay = 60 * (2 ** self.request.retries)
            jitter = random.uniform(0.1, 0.3) * base_delay
            raise self.retry(countdown=base_delay + jitter, exc=exc)

@celery_app.task(bind=True, max_retries=2)
def generate_content(self, article_id: int, correlation_id: str):
    """Generate content for processed article."""
    try:
        logger.info(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "generation",
            "action": "start",
            "retry_count": self.request.retries
        }))
        
        generator = ContentGenerator()
        results = generator.generate_for_article(article_id)
        
        logger.info(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "generation",
            "action": "complete",
            "result": "success",
            "platforms": list(results.keys())
        }))
        
    except Exception as exc:
        logger.error(json.dumps({
            "correlation_id": correlation_id,
            "article_id": article_id,
            "stage": "generation",
            "action": "error",
            "error": str(exc),
            "retry_count": self.request.retries
        }))

@celery_app.task(bind=True, max_retries=3)
def reconcile_stuck_tasks(self):
    from datetime import datetime, timedelta
    from backend.models import RawArticle
    from backend.metrics import PipelineMetrics

    logger.info("reconcile_stuck_tasks: starting run")
    reconciled = 0
    skipped    = 0
    errors     = 0
    batch_size = 100
    last_id    = 0                          # cursor — stable across data changes
    cutoff     = datetime.utcnow() - timedelta(minutes=30)

    MAX_ENQUEUE = 1000                      # flood protection — see Enhancement 5

    try:
        while True:
            with get_session() as session:
                batch = (
                    session.query(RawArticle)
                    .filter(
                        RawArticle.id > last_id,               # cursor, not OFFSET
                        RawArticle.state.in_(["analyzing", "pending"]),
                        RawArticle.fetched_at < cutoff
                    )
                    .order_by(RawArticle.id)
                    .limit(batch_size)
                    .all()
                )

                if not batch:
                    break

                for article in batch:
                    last_id = article.id    # advance cursor on every row

                    if reconciled >= MAX_ENQUEUE:
                        logger.warning(
                            f"reconcile_stuck_tasks: enqueue cap {MAX_ENQUEUE} reached — "
                            f"remaining rows deferred to next run"
                        )
                        break

                    try:
                        idempotency_key = generate_idempotency_key(article.id)
                        if check_and_set_idempotency(idempotency_key, article.id):
                            skipped += 1
                            continue
                        process_article.delay(article.id, idempotency_key)
                        reconciled += 1
                    except Exception as e:
                        logger.error(f"reconcile failed for article {article.id}: {e}")
                        errors += 1

                else:
                    continue   # inner loop completed normally — fetch next batch
                break          # inner loop hit MAX_ENQUEUE — stop outer loop too

    except Exception as e:
        logger.error(f"reconcile_stuck_tasks: fatal — {e}")
        raise self.retry(exc=e, countdown=60)

    finally:
        # Always emit — proves job ran even if zero articles found
        metrics_instance = PipelineMetrics()
        metrics_instance.active_workers.set(reconciled)
        metrics_instance.queue_depth.set(skipped)
        metrics_instance.task_retries.labels(task_type='reconciliation').inc(errors)
        logger.info(
            f"reconcile_stuck_tasks: done — "
            f"reconciled={reconciled} skipped={skipped} errors={errors}"
        )

def check_and_set_idempotency(idempotency_key, article_id):
    from backend.models import IdempotencyLog

    with get_session() as session:
        existing = session.query(IdempotencyLog).filter_by(key=idempotency_key).first()
        if existing:
            return True
        session.add(IdempotencyLog(key=idempotency_key, article_id=article_id))
        session.commit()
    return False

def generate_idempotency_key(article_id):
    return f"reconcile:{article_id}"

def dedupe_message(message_id):
    import redis as redis_lib
    from backend.config import settings
    redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)
    return redis_client.set(f"msg:{message_id}", "1", ex=3600, nx=True)

@celery_app.task
def check_state_consistency():
    """
    Spot-check a sample of terminal DB records against their Redis
    cache entries. Compares the SAME key namespace in both systems.
    Idempotency keys are NOT article state — never compare them.
    """
    import redis as redis_lib
    from backend.models import RawArticle
    from backend.metrics import PipelineMetrics
    from backend.redis_keys import get_article_status_key

    mismatches = 0
    checked    = 0
    missing    = 0

    redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)

    with SessionLocal() as session:
        recent = (
            session.query(RawArticle)
            .filter(RawArticle.state.in_(["failed", "analysis_failed"]))
            .order_by(RawArticle.fetched_at.desc())
            .limit(500)
            .all()
        )

        for article in recent:
            redis_key = get_article_status_key(article.id)
            redis_val = redis_client.get(redis_key)
            checked += 1

            if redis_val is None:
                missing += 1
                continue

            if redis_val.decode() != article.state:
                logger.error(
                    "state mismatch: article %s db=%s redis=%s",
                    article.id, article.state, redis_val.decode()
                )
                mismatches += 1

    metrics_instance = PipelineMetrics()
    metrics_instance.active_workers.set(checked)
    metrics_instance.queue_depth.labels(queue='consistency').set(missing)
    metrics_instance.llm_calls.labels(provider='system', task='consistency').inc(mismatches)

    if mismatches > 10:
        logger.error("DB/Redis state mismatch exceeds threshold: %d", mismatches)

    logger.info("consistency check: checked=%d missing=%d mismatches=%d", checked, missing, mismatches)

@celery_app.task
def scrape_redis_metrics():
    """Scrape Redis memory and eviction metrics on schedule."""
    import redis as redis_lib
    from backend.metrics import metrics
    redis_client = redis_lib.from_url(settings.REDIS_URL, decode_responses=False)
    metrics.scrape_redis_memory_metrics(redis_client)

@celery_app.task
def cleanup_stuck_articles():
    from datetime import datetime, timedelta
    from backend.models import RawArticle
    from backend.metrics import PipelineMetrics

    cutoff     = datetime.utcnow() - timedelta(hours=6)
    failed_ids = []

    with SessionLocal() as session:
        stuck = session.query(RawArticle).filter(
            RawArticle.state.in_(["analyzing", "pending"]),
            RawArticle.fetched_at < cutoff
        ).all()

        for article in stuck:
            article.state        = "timeout_failed"   # distinct from permanent "failed"
            article.retry_allowed = True               # operator can requeue if cause was transient
            article.failed_reason = "cleanup_job_timeout"  # requires column
            failed_ids.append(article.id)

        session.commit()

    # Log first 20 IDs for forensic audit trail
    logger.warning(
        f"cleanup_stuck_articles: failed {len(failed_ids)} articles "
        f"— sample ids={failed_ids[:20]}"
    )
    
    # Emit metrics
    metrics_instance = PipelineMetrics()
    metrics_instance.task_retries.labels(task_type='cleanup').inc(len(failed_ids))


@celery_app.task(bind=True, max_retries=2)
def learn_user_style(self, platform: str = None):
    """
    Async task to learn user style preferences from recent feedback.
    This runs in background so API responses remain fast.
    
    Args:
        platform: Optional specific platform to analyze. If None, analyzes all.
    """
    try:
        logger.info(f"Starting style learning task for platform: {platform}")
        
        from backend.processors.personalization_engine import personalization_engine
        from backend.db.session import SessionLocal
        
        db = SessionLocal()
        try:
            personalization_engine.analyze_user_style(db=db, platform=platform)
            logger.info(f"Successfully completed style learning for platform: {platform}")
        finally:
            db.close()
            
    except Exception as exc:
        logger.error(f"Style learning failed: {exc}", exc_info=True)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
        else:
            logger.error(f"Style learning permanently failed after {self.max_retries} retries")