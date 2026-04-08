import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Hook for fetching platform-specific data for a story
 */
export const usePlatforms = (storyId) => {
  return useQuery({
    queryKey: ['platforms', storyId],
    queryFn: async () => {
      const response = await api.get(`/stories/${storyId}/platforms`);
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!storyId,
  });
};

/**
 * Hook for fetching available platforms
 */
export const useAvailablePlatforms = () => {
  return useQuery({
    queryKey: ['platforms', 'available'],
    queryFn: async () => {
      const response = await api.get('/platforms');
      return response.data || [];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Hook for fetching platform-specific content
 */
export const usePlatformContent = (storyId, platform) => {
  return useQuery({
    queryKey: ['platform-content', storyId, platform],
    queryFn: async () => {
      const response = await api.get(`/stories/${storyId}/platforms/${platform}/content`);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!storyId && !!platform,
  });
};
