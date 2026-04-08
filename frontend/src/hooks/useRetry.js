import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Retry hook with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @returns {Object} Retry state and execute function
 */
export const useRetry = (fn, options = {}) => {
  const { maxRetries = 3, delay = 1000 } = options;
  const queryClient = useQueryClient();
  
  return useCallback(async (...args) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const result = await fn(...args);
        return result;
      } catch (error) {
        lastError = error;
        
        if (i < maxRetries) {
          const backoffDelay = delay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        }
      }
    }
    
    throw lastError;
  }, [fn, maxRetries, delay]);
};

/**
 * Hook for mutations with retry logic
 * @param {Function} mutationFn - Mutation function
 * @param {Object} options - Mutation options
 * @returns {Object} Mutation hook with retry
 */
export const useRetryMutation = (mutationFn, options = {}) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options
  });
};
