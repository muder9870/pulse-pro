from flask import Blueprint, jsonify
from backend.db.session import SessionLocal
import time
import logging

# Import redis_client properly
try:
    from backend.llm.llm_router import redis_client
except ImportError:
    # Fallback if redis_client is not available
    redis_client = None

performance_bp = Blueprint('performance', __name__)

def calculate_cache_hit_rate():
    """Calculate cache hit rate from Redis."""
    if not redis_client:
        return 0.0
        
    try:
        # Get cache stats (this is a simplified version)
        total_requests = redis_client.get('cache_total_requests') or 0
        cache_hits = redis_client.get('cache_hits') or 0
        
        if int(total_requests) > 0:
            hit_rate = (int(cache_hits) / int(total_requests)) * 100
            return round(hit_rate, 2)
        return 0.0
    except Exception as e:
        logging.error(f"Error calculating cache hit rate: {e}")
        return 0.0

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

def get_response_time_metrics():
    """Get LLM response time metrics from logs."""
    # This is a placeholder - in production, you'd collect this from logs
    return {
        'avg_response_time': 0.0,
        'p95_response_time': 0.0,
        'p99_response_time': 0.0
    }

def get_throughput_metrics():
    """Get processing throughput metrics."""
    # This is a placeholder - in production, you'd calculate from actual data
    return {
        'articles_per_hour': 0,
        'content_per_hour': 0,
        'processing_rate': 0.0
    }

@performance_bp.get("/api/performance/metrics")
def performance_metrics():
    """Get comprehensive performance metrics."""
    try:
        metrics = {
            'cache_hit_rate': calculate_cache_hit_rate(),
            'db_connection_pool': get_pool_usage(),
            'llm_response_times': get_response_time_metrics(),
            'processing_throughput': get_throughput_metrics(),
            'timestamp': time.time(),
            'status': 'healthy'
        }
        
        logging.info("Performance metrics requested", extra=metrics)
        return jsonify(metrics), 200
        
    except Exception as e:
        logging.error(f"Error getting performance metrics: {e}")
        return jsonify({"error": str(e)}), 500

@performance_bp.get("/api/performance/cache-stats")
def cache_stats():
    """Get detailed cache statistics."""
    try:
        if not redis_client:
            return jsonify({"error": "Redis not available"}), 503
            
        # Get cache keys and their TTL
        cache_info = {}
        for key in redis_client.scan_iter(match="*"):
            ttl = redis_client.ttl(key)
            cache_info[key] = {
                'ttl': ttl,
                'type': 'cached' if ttl > 0 else 'expired'
            }
        
        return jsonify({
            'cache_keys_count': len(cache_info),
            'cache_info': cache_info
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting cache stats: {e}")
        return jsonify({"error": str(e)}), 500
