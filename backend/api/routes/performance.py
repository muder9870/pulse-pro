from flask import Blueprint, jsonify
from backend.db.session import SessionLocal
import time
import logging

# Import redis_client properly
try:
    from backend.llm.llm_router import redis_client
except ImportError:
    redis_client = None

performance_bp = Blueprint('performance', __name__)


def get_pool_usage():
    """Get database connection pool usage."""
    try:
        from backend.db.session import engine
        pool = engine.pool
        return {
            'size': pool.size(),
            'checked_in': pool.checkedin(),
            'checked_out': pool.checkedout(),
            'overflow': pool.overflow(),
            'invalid': pool.invalid()
        }
    except Exception as e:
        logging.error(f"Error getting pool usage: {e}")
        return {}


def get_throughput_metrics(db) -> dict:
    """Calculate real throughput from the database."""
    from sqlalchemy import func, text
    from datetime import datetime, timezone, timedelta
    from backend.db.models import RawArticle, ProcessedArticle, GeneratedContent

    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    last_1h = now - timedelta(hours=1)

    try:
        articles_24h = db.query(func.count(RawArticle.id)).filter(
            RawArticle.fetched_at >= last_24h
        ).scalar() or 0

        articles_1h = db.query(func.count(RawArticle.id)).filter(
            RawArticle.fetched_at >= last_1h
        ).scalar() or 0

        analyzed_24h = db.query(func.count(ProcessedArticle.id)).filter(
            ProcessedArticle.processed_at >= last_24h
        ).scalar() or 0

        content_24h = db.query(func.count(GeneratedContent.id)).filter(
            GeneratedContent.generated_at >= last_24h
        ).scalar() or 0

        total_articles = db.query(func.count(RawArticle.id)).scalar() or 0
        total_analyzed = db.query(func.count(ProcessedArticle.id)).scalar() or 0
        total_content = db.query(func.count(GeneratedContent.id)).scalar() or 0

        return {
            'articles_last_1h': articles_1h,
            'articles_last_24h': articles_24h,
            'analyzed_last_24h': analyzed_24h,
            'content_last_24h': content_24h,
            'total_articles': total_articles,
            'total_analyzed': total_analyzed,
            'total_content_generated': total_content,
        }
    except Exception as e:
        logging.error(f"Error getting throughput metrics: {e}")
        return {}


def get_llm_stats(db) -> dict:
    """Get real LLM stats from system_status table."""
    try:
        from backend.db.models import SystemStatus
        llm_services = db.query(SystemStatus).filter(
            SystemStatus.service_name.like('llm%')
        ).all()

        total_success = sum(s.success_count or 0 for s in llm_services)
        total_failure = sum(s.failure_count or 0 for s in llm_services)
        total_calls = total_success + total_failure
        success_rate = round(total_success / total_calls * 100, 1) if total_calls > 0 else 0.0

        # Find the primary LLM router entry
        primary = next((s for s in llm_services if s.service_name == 'llm'), None)

        return {
            'total_llm_calls': total_calls,
            'successful_calls': total_success,
            'failed_calls': total_failure,
            'success_rate_pct': success_rate,
            'primary_router_ok': primary.status == 'ok' if primary else False,
        }
    except Exception as e:
        logging.error(f"Error getting LLM stats: {e}")
        return {}


def get_redis_stats() -> dict:
    """Get real Redis stats."""
    if not redis_client:
        return {'available': False}
    try:
        info = redis_client.info()
        mem_info = redis_client.info('memory')
        key_count = redis_client.dbsize()
        return {
            'available': True,
            'total_keys': key_count,
            'used_memory_mb': round(mem_info.get('used_memory', 0) / 1024 / 1024, 2),
            'connected_clients': info.get('connected_clients', 0),
            'total_commands_processed': info.get('total_commands_processed', 0),
            'keyspace_hits': info.get('keyspace_hits', 0),
            'keyspace_misses': info.get('keyspace_misses', 0),
        }
    except Exception as e:
        logging.error(f"Error getting Redis stats: {e}")
        return {'available': False, 'error': str(e)}


@performance_bp.get("/api/performance/metrics")
def performance_metrics():
    """Get comprehensive performance metrics from real data sources."""
    db = SessionLocal()
    try:
        result = {
            'db_connection_pool': get_pool_usage(),
            'throughput': get_throughput_metrics(db),
            'llm': get_llm_stats(db),
            'redis': get_redis_stats(),
            'timestamp': time.time(),
            'status': 'healthy'
        }
        return jsonify(result), 200
    except Exception as e:
        logging.error(f"Error getting performance metrics: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        db.close()


@performance_bp.get("/api/performance/cache-stats")
def cache_stats():
    """Get Redis cache summary stats."""
    try:
        if not redis_client:
            return jsonify({"error": "Redis not available"}), 503

        info = redis_client.info()
        mem_info = redis_client.info('memory')
        key_count = redis_client.dbsize()

        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        hit_rate = round(hits / total * 100, 1) if total > 0 else 0.0

        return jsonify({
            'cache_keys_count': key_count,
            'hit_rate_pct': hit_rate,
            'keyspace_hits': hits,
            'keyspace_misses': misses,
            'used_memory_mb': round(mem_info.get('used_memory', 0) / 1024 / 1024, 2),
            'peak_memory_mb': round(mem_info.get('used_memory_peak', 0) / 1024 / 1024, 2),
            'evicted_keys': info.get('evicted_keys', 0),
            'connected_clients': info.get('connected_clients', 0),
        }), 200

    except Exception as e:
        logging.error(f"Error getting cache stats: {e}")
        return jsonify({"error": str(e)}), 500
