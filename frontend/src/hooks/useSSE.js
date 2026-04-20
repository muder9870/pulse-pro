import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useSSE Hook
 * Custom hook for Server-Sent Events (SSE) connections
 * Used for real-time pipeline progress updates from /api/pipeline/stream
 * 
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Cleanup on unmount
 * - Error state handling
 * - Connection status tracking
 * 
 * @param {string} url - SSE endpoint URL
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether to connect (default: true)
 * @param {number} options.maxRetries - Max reconnection attempts (default: 5)
 * @param {number} options.baseDelay - Base reconnection delay in ms (default: 1000)
 * @param {Function} options.onMessage - Callback for SSE messages
 * @param {Function} options.onError - Callback for SSE errors
 * @param {Function} options.onOpen - Callback when connection opens
 * 
 * @returns {Object} { data, error, isConnected, reconnect }
 * 
 * @example
 * const { data, error, isConnected } = useSSE('/api/pipeline/stream', {
 *   onMessage: (event) => console.log('Pipeline update:', event.data),
 *   onError: (err) => console.error('SSE error:', err)
 * });
 */
const useSSE = (url, options = {}) => {
  const {
    enabled = true,
    maxRetries = 5,
    baseDelay = 1000,
    onMessage,
    onError,
    onOpen,
  } = options;

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled || !url) return;

    // Clean up any existing connection
    cleanup();

    try {
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        setError(null);
        setRetryCount(0);
        if (onOpen) onOpen();
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          setData(parsed);
          if (onMessage) onMessage(parsed, event);
        } catch (err) {
          // If not JSON, pass raw data
          setData(event.data);
          if (onMessage) onMessage(event.data, event);
        }
      };

      es.onerror = (err) => {
        setIsConnected(false);
        setError(err);
        
        if (onError) onError(err);

        // Auto-reconnect with exponential backoff
        if (retryCount < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, retryCount), 30000); // Max 30s delay
          setRetryCount(prev => prev + 1);
          
          retryTimeoutRef.current = setTimeout(() => {
            if (import.meta.env.DEV) {
              console.log(`SSE reconnecting... attempt ${retryCount + 1}/${maxRetries}`);
            }
            connect();
          }, delay);
        } else {
          console.error('SSE max retries exceeded');
          cleanup();
        }
      };

    } catch (err) {
      setError(err);
      setIsConnected(false);
      if (onError) onError(err);
    }
  }, [url, enabled, maxRetries, baseDelay, onMessage, onError, onOpen, retryCount, cleanup]);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    setError(null);
    connect();
  }, [connect]);

  // Initial connection
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      cleanup();
    }

    // Cleanup on unmount
    return cleanup;
  }, [enabled, connect, cleanup]);

  return {
    data,
    error,
    isConnected,
    retryCount,
    reconnect,
  };
};

export default useSSE;
