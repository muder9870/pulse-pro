import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Hook to manage stories data fetching with server-side pagination.
 *
 * Uses useInfiniteQuery so pages are appended (not replaced) when
 * the user clicks "Load More". Each page fetches PAGE_SIZE stories.
 */
const PAGE_SIZE = 20;

export const useStories = (options = {}) => {
  const { sort, source, state } = options;
  const sourceKey = typeof source === 'string' ? source : source?.name || null;

  return useInfiniteQuery({
    queryKey: ['stories', sort ?? null, sourceKey, state ?? null],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('page', String(pageParam));
      if (sort) params.set('sort', sort);
      if (sourceKey) params.set('source', sourceKey);
      if (state) params.set('state', state);
      const data = await api.get(`/stories?${params.toString()}`);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.data)) return data.data;
      return [];
    },
    getNextPageParam: (lastPage, allPages) => {
      // If the last page returned a full page, there may be more
      if (lastPage.length === PAGE_SIZE) return allPages.length + 1;
      return undefined; // no more pages
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook to manage story data fetching with complete endpoint
 */
export const useStoryComplete = (storyId) => {
  return useQuery({
    queryKey: ['story-complete', storyId],
    queryFn: () => api.get(`/stories/${storyId}/complete`),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!storyId
  });
};

/**
 * Hook to manage unique sources data fetching.
 */
export const useSources = () => {
  return useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const data = await api.get('/stories/sources');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};
