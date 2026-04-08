import { useQuery } from '@tanstack/react-query';

/**
 * useAnalytics Hook
 * 
 * Dedicated hook for analytics data.
 * Separated from useStories to avoid cache conflicts.
 * 
 * @param {Object} options - Query options
 * @param {string} options.timeRange - Time range for analytics ('24h', '7d', '30d', '90d')
 * @param {boolean} options.enabled - Whether to enable the query
 */
export function useAnalytics({ timeRange = '7d', enabled = true } = {}) {
  return useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
}

export default useAnalytics;
