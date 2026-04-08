import { useEffect, useRef } from 'react';

/**
 * useInfiniteScroll - Hook for infinite scroll pagination
 * 
 * Watches a sentinel element and triggers load more callback
 * when it enters the viewport.
 * 
 * @param {Object} options - Configuration
 * @param {Function} options.onLoadMore - Callback when more items should load
 * @param {boolean} options.hasMore - Whether more items are available
 * @param {string} options.rootMargin - Margin around root (default: '100px')
 */
export function useInfiniteScroll({ onLoadMore, hasMore, rootMargin = '100px' }) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore) {
          onLoadMore?.();
        }
      },
      { rootMargin }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [hasMore, onLoadMore, rootMargin]);

  return { sentinelRef };
}

export default useInfiniteScroll;
