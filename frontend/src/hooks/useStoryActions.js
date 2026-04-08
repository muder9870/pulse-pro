import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Hook for story-specific actions
 * 
 * Handles all CRUD operations and actions for individual stories
 */
export const useStoryActions = (storyId) => {
  const queryClient = useQueryClient();

  // Generate content for a specific platform
  const generateContentMutation = useMutation({
    mutationFn: async (platform) => {
      const response = await api.post(`/stories/${storyId}/generate`, { platform });
      return response.data;
    },
    onSuccess: () => {
      // Invalidate story data to trigger refetch
      queryClient.invalidateQueries(['story', storyId]);
      queryClient.invalidateQueries(['story-complete', storyId]);
    },
    onError: (error) => {
      console.error('Failed to generate content:', error);
    }
  });

  // Post to platforms
  const postToPlatformsMutation = useMutation({
    mutationFn: async (platforms) => {
      const response = await api.post(`/stories/${storyId}/post`, { platforms });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['story', storyId]);
      queryClient.invalidateQueries(['story-complete', storyId]);
      queryClient.invalidateQueries(['stories']); // Refresh stories list
    },
    onError: (error) => {
      console.error('Failed to post to platforms:', error);
    }
  });

  // Update story with optimistic update
  const updateStoryMutation = useMutation({
    mutationFn: async (updates) => {
      const response = await api.put(`/stories/${storyId}`, updates);
      return response.data;
    },
    onMutate: async (updates) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['story', storyId]);
      await queryClient.cancelQueries(['story-complete', storyId]);
      
      // Snapshot previous value
      const previousStory = queryClient.getQueryData(['story', storyId]);
      const previousComplete = queryClient.getQueryData(['story-complete', storyId]);
      
      // Optimistically update
      queryClient.setQueryData(['story', storyId], (old) => old ? { ...old, ...updates } : old);
      queryClient.setQueryData(['story-complete', storyId], (old) => old ? { ...old, ...updates } : old);
      
      return { previousStory, previousComplete };
    },
    onError: (error, updates, context) => {
      // Rollback on error
      if (context?.previousStory) {
        queryClient.setQueryData(['story', storyId], context.previousStory);
      }
      if (context?.previousComplete) {
        queryClient.setQueryData(['story-complete', storyId], context.previousComplete);
      }
      console.error('Failed to update story:', error);
    },
    onSettled: () => {
      // Invalidate to ensure sync with server
      queryClient.invalidateQueries(['story', storyId]);
      queryClient.invalidateQueries(['story-complete', storyId]);
      queryClient.invalidateQueries(['stories']);
    }
  });

  // Delete story
  const deleteStoryMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/stories/${storyId}`);
      return storyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['stories']);
      // Remove from cache
      queryClient.removeQueries(['story', storyId]);
      queryClient.removeQueries(['story-complete', storyId]);
    },
    onError: (error) => {
      console.error('Failed to delete story:', error);
    }
  });

  // Toggle story status with optimistic update
  const toggleStatusMutation = useMutation({
    mutationFn: async (status) => {
      const response = await api.patch(`/stories/${storyId}/status`, { status });
      return response.data;
    },
    onMutate: async (status) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['story', storyId]);
      await queryClient.cancelQueries(['story-complete', storyId]);
      
      // Snapshot previous value
      const previousStory = queryClient.getQueryData(['story', storyId]);
      const previousComplete = queryClient.getQueryData(['story-complete', storyId]);
      
      // Optimistically update status
      queryClient.setQueryData(['story', storyId], (old) => old ? { ...old, status } : old);
      queryClient.setQueryData(['story-complete', storyId], (old) => old ? { ...old, status } : old);
      
      return { previousStory, previousComplete };
    },
    onError: (error, status, context) => {
      // Rollback on error
      if (context?.previousStory) {
        queryClient.setQueryData(['story', storyId], context.previousStory);
      }
      if (context?.previousComplete) {
        queryClient.setQueryData(['story-complete', storyId], context.previousComplete);
      }
      console.error('Failed to toggle status:', error);
    },
    onSettled: () => {
      // Invalidate to ensure sync with server
      queryClient.invalidateQueries(['story', storyId]);
      queryClient.invalidateQueries(['story-complete', storyId]);
      queryClient.invalidateQueries(['stories']);
    }
  });

  return {
    // Actions
    generateContent: generateContentMutation.mutateAsync,
    postToPlatforms: postToPlatformsMutation.mutateAsync,
    updateStory: updateStoryMutation.mutateAsync,
    deleteStory: deleteStoryMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,

    // Loading states
    isLoading: 
      generateContentMutation.isLoading ||
      postToPlatformsMutation.isLoading ||
      updateStoryMutation.isLoading ||
      deleteStoryMutation.isLoading ||
      toggleStatusMutation.isLoading,

    // Error states
    errors: {
      generateContent: generateContentMutation.error,
      postToPlatforms: postToPlatformsMutation.error,
      updateStory: updateStoryMutation.error,
      deleteStory: deleteStoryMutation.error,
      toggleStatus: toggleStatusMutation.error,
    },

    // Reset functions
    reset: {
      generateContent: generateContentMutation.reset,
      postToPlatforms: postToPlatformsMutation.reset,
      updateStory: updateStoryMutation.reset,
      deleteStory: deleteStoryMutation.reset,
      toggleStatus: toggleStatusMutation.reset,
    }
  };
};
