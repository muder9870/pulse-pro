import React, { useState, useEffect, useCallback } from 'react';

/**
 * Enhanced Error Handler Hook with Retry Logic and Exponential Backoff
 * 
 * Provides comprehensive error handling with:
 * - Automatic retry with exponential backoff
 * - Error categorization and user-friendly messages
 * - Error reporting integration
 * - Recovery strategies
 */
export const useErrorHandler = (options = {}) => {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    enableRetry = true,
    enableReporting = true,
    enableToast = true
  } = options;

  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Calculate exponential backoff delay with jitter
  const calculateDelay = useCallback((attempt) => {
    const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * exponentialDelay;
    return Math.floor(exponentialDelay + jitter);
  }, [baseDelay, maxDelay]);

  // Categorize error type
  const categorizeError = useCallback((error) => {
    if (!error) return 'unknown';
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    } else if (message.includes('timeout')) {
      return 'timeout';
    } else if (message.includes('unauthorized') || message.includes('401')) {
      return 'auth';
    } else if (message.includes('forbidden') || message.includes('403')) {
      return 'permission';
    } else if (message.includes('not found') || message.includes('404')) {
      return 'not_found';
    } else if (message.includes('server') || message.includes('500')) {
      return 'server';
    } else if (message.includes('validation') || message.includes('400')) {
      return 'validation';
    }
    
    return 'application';
  }, []);

  // Get user-friendly error message
  const getUserFriendlyMessage = useCallback((error, category) => {
    const messages = {
      network: 'Network connection issue. Please check your internet connection and try again.',
      timeout: 'Request timed out. The server took too long to respond. Please try again.',
      auth: 'Authentication required. Please log in and try again.',
      permission: 'You don\'t have permission to perform this action.',
      not_found: 'The requested resource was not found.',
      server: 'Server error. Please try again later.',
      validation: 'Invalid input. Please check your data and try again.',
      application: 'An unexpected error occurred. Please try again.',
      unknown: 'An error occurred. Please try again.'
    };
    
    return messages[category] || messages.unknown;
  }, []);

  // Check if error is retryable
  const isRetryableError = useCallback((error, category) => {
    const retryableCategories = ['network', 'timeout', 'server'];
    return retryableCategories.includes(category) && enableRetry;
  }, [enableRetry]);

  // Retry function with exponential backoff
  const retry = useCallback(async (retryFunction) => {
    if (!error || !isRetryableError(error, categorizeError(error))) {
      return false;
    }

    if (retryCount >= maxRetries) {
      setError({
        ...error,
        message: 'Maximum retry attempts reached. Please refresh the page.',
        isFinal: true
      });
      return false;
    }

    setIsRetrying(true);
    const delay = calculateDelay(retryCount);

    try {
      // Show retry notification
      if (enableToast && window.toast) {
        window.toast.warning(`Retrying... (${retryCount + 1}/${maxRetries})`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
      
      const result = await retryFunction();
      setRetryCount(0);
      setError(null);
      setIsRetrying(false);
      
      if (enableToast && window.toast) {
        window.toast.success('Operation completed successfully');
      }
      
      return result;
    } catch (retryError) {
      setRetryCount(prev => prev + 1);
      setError(retryError);
      setIsRetrying(false);
      
      // Log retry error
      if (enableReporting && window.errorReporting) {
        window.errorReporting.log(retryError, {
          isRetry: true,
          retryAttempt: retryCount + 1,
          retryDelay: delay
        });
      }
      
      return false;
    }
  }, [error, retryCount, maxRetries, calculateDelay, isRetryableError, categorizeError, enableToast, enableReporting]);

  // Handle error with enhanced logic
  const handleError = useCallback((error, context = {}) => {
    const category = categorizeError(error);
    const userMessage = getUserFriendlyMessage(error, category);
    
    console.error(`Error in ${context.component || 'unknown'}:`, error);
    
    setError({
      ...error,
      category,
      userMessage,
      isRetryable: isRetryableError(error, category),
      context
    });

    // Log to error reporting service
    if (enableReporting && window.errorReporting) {
      window.errorReporting.log(error, {
        componentStack: error.stack,
        category,
        isRetryable: isRetryableError(error, category),
        userInfo: { userAgent: navigator.userAgent },
        timestamp: new Date().toISOString(),
        ...context
      });
    }

    // Show toast notification
    if (enableToast && window.toast) {
      if (category === 'network' || category === 'timeout') {
        window.toast.error(userMessage, { duration: 5000 });
      } else {
        window.toast.error(userMessage);
      }
    }

    // Reset retry count for new errors
    setRetryCount(0);
  }, [categorizeError, getUserFriendlyMessage, isRetryableError, enableReporting, enableToast]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  // Reset retry count
  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
  }, []);

  // Get error statistics
  const getErrorStats = useCallback(() => {
    return {
      hasError: !!error,
      category: error?.category,
      isRetryable: error?.isRetryable,
      retryCount,
      isRetrying,
      canRetry: error?.isRetryable && retryCount < maxRetries
    };
  }, [error, retryCount, isRetrying, maxRetries]);

  return {
    // State
    error,
    retryCount,
    isRetrying,
    
    // Actions
    handleError,
    clearError,
    retry,
    resetRetryCount,
    
    // Utilities
    getErrorStats,
    calculateDelay,
    categorizeError,
    getUserFriendlyMessage,
    isRetryableError
  };
};

/**
 * Hook for handling API-specific errors
 */
export const useApiErrorHandler = (options = {}) => {
  const errorHandler = useErrorHandler({
    maxRetries: 3,
    baseDelay: 1000,
    enableRetry: true,
    ...options
  });

  const handleApiError = useCallback((error, apiContext = {}) => {
    const context = {
      component: 'API',
      endpoint: apiContext.endpoint,
      method: apiContext.method,
      ...apiContext
    };
    
    errorHandler.handleError(error, context);
  }, [errorHandler]);

  return {
    ...errorHandler,
    handleApiError
  };
};
