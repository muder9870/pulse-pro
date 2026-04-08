import requests
import time
import statistics
import json
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://127.0.0.1:5000"
ENDPOINTS = {
    "Stories (Cached)": "/api/stories?limit=10",
    "Analytics (Cached)": "/api/analytics/summary",
    "Health (Cached)": "/health",
    "Metrics": "/api/metrics"
}

def measure_latency(url, iterations=10):
    latencies = []
    for _ in range(iterations):
        start = time.time()
        try:
            resp = requests.get(f"{BASE_URL}{url}", timeout=10)
            resp.raise_for_status()
            latencies.append((time.time() - start) * 1000)
        except Exception as e:
            print(f"Error fetching {url}: {e}")
    
    if not latencies:
        return None
    
    return {
        "min": min(latencies),
        "max": max(latencies),
        "avg": statistics.mean(latencies)
    }

def test_concurrency(url, workers=10, requests_per_worker=5):
    def worker_task():
        latencies = []
        for _ in range(requests_per_worker):
            start = time.time()
            try:
                requests.get(f"{BASE_URL}{url}", timeout=10)
                latencies.append((time.time() - start) * 1000)
            except:
                pass
        return latencies

    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(worker_task) for _ in range(workers)]
        results = []
        for f in futures:
            results.extend(f.result())
    
    return {
        "total_requests": len(results),
        "avg_latency": statistics.mean(results) if results else 0,
        "success_rate": f"{(len(results) / (workers * requests_per_worker)) * 100}%"
    }

def run_benchmark():
    print("=== AI Pulse Pro Performance Benchmark ===")
    print(f"Target: {BASE_URL}\n")
    
    # 1. Warm up cache
    print("Warming up caches...")
    for name, url in ENDPOINTS.items():
        try:
            requests.get(f"{BASE_URL}{url}", timeout=10)
        except:
            pass
    
    time.sleep(1) # Let system settle
    
    # 2. Sequential Latency
    print("Measuring sequential latency...")
    for name, url in ENDPOINTS.items():
        stats = measure_latency(url)
        if stats:
            print(f"{name:20} | Avg: {stats['avg']:7.2f}ms | Min: {stats['min']:7.2f}ms | Max: {stats['max']:7.2f}ms")
    
    # 3. Concurrency Test
    print("\nRunning concurrency test (50 requests across 10 threads)...")
    conc_stats = test_concurrency("/api/stories?limit=10")
    print(f"Avg Latency under load: {conc_stats['avg_latency']:.2f}ms")
    print(f"Success Rate: {conc_stats['success_rate']}")
    
    # 4. Cache Efficiency
    print("\nChecking cache efficiency...")
    try:
        resp = requests.get(f"{BASE_URL}/api/metrics", timeout=10).json()
        cache_stats = resp.get("cache", {})
        print(f"Cache Hits: {cache_stats.get('hits', 0)}")
        print(f"Cache Misses: {cache_stats.get('misses', 0)}")
        total = cache_stats.get('hits', 0) + cache_stats.get('misses', 0)
        if total > 0:
            hit_rate = (cache_stats['hits'] / total) * 100
            print(f"Hit Rate: {hit_rate:.2f}%")
    except Exception as e:
        print(f"Could not fetch metrics: {e}")

if __name__ == "__main__":
    run_benchmark()
