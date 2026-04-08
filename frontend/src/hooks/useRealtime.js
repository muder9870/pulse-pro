import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enhanced Real-time Hook with WebSocket/SSE Support
 * 
 * Handles real-time updates with fallback mechanisms, reconnection logic,
 * and integration with React Query for cache invalidation.
 */
export const useRealtime = (endpoint, options = {}) => {
  const {
    type = 'sse', // 'sse' or 'websocket'
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
    queryClient
  } = options;

  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const connectionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Clear reconnection timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Handle reconnection
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setError('Maximum reconnection attempts reached');
      return;
    }

    clearReconnectTimeout();
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      connect();
    }, reconnectInterval);
  }, [reconnectAttempts, maxReconnectAttempts, reconnectInterval]);

  // SSE connection
  const connectSSE = useCallback(() => {
    try {
      const eventSource = new EventSource(endpoint);
      connectionRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        onConnect?.();
      };

      eventSource.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          onMessage?.(parsedData);

          // Invalidate related queries if queryClient provided
          if (queryClient) {
            if (parsedData.type === 'story_update') {
              queryClient.invalidateQueries(['stories']);
              queryClient.invalidateQueries(['story', parsedData.storyId]);
            } else if (parsedData.type === 'pipeline_update') {
              queryClient.invalidateQueries(['pipeline']);
            }
          }
        } catch (err) {
          const errorMsg = `Failed to parse message: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
        }
      };

      eventSource.onerror = (event) => {
        setIsConnected(false);
        const errorMsg = 'SSE connection error';
        setError(errorMsg);
        onError?.(errorMsg);
        
        eventSource.close();
        scheduleReconnect();
      };

    } catch (err) {
      const errorMsg = `Failed to create SSE connection: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
      scheduleReconnect();
    }
  }, [endpoint, onMessage, onError, onConnect, queryClient, scheduleReconnect]);

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    try {
      const ws = new WebSocket(endpoint);
      connectionRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const parsedData = JSON.parse(event.data);
          setData(parsedData);
          onMessage?.(parsedData);

          // Invalidate related queries if queryClient provided
          if (queryClient) {
            if (parsedData.type === 'story_update') {
              queryClient.invalidateQueries(['stories']);
              queryClient.invalidateQueries(['story', parsedData.storyId]);
            } else if (parsedData.type === 'pipeline_update') {
              queryClient.invalidateQueries(['pipeline']);
            }
          }
        } catch (err) {
          const errorMsg = `Failed to parse WebSocket message: ${err.message}`;
          setError(errorMsg);
          onError?.(errorMsg);
        }
      };

      ws.onerror = (event) => {
        setIsConnected(false);
        const errorMsg = 'WebSocket connection error';
        setError(errorMsg);
        onError?.(errorMsg);
        scheduleReconnect();
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (!event.wasClean) {
          const errorMsg = 'WebSocket connection closed unexpectedly';
          setError(errorMsg);
          onError?.(errorMsg);
          scheduleReconnect();
        }
      };

    } catch (err) {
      const errorMsg = `Failed to create WebSocket connection: ${err.message}`;
      setError(errorMsg);
      onError?.(errorMsg);
      scheduleReconnect();
    }
  }, [endpoint, onMessage, onError, onConnect, queryClient, scheduleReconnect]);

  // Main connect function
  const connect = useCallback(() => {
    if (type === 'websocket') {
      connectWebSocket();
    } else {
      connectSSE();
    }
  }, [type, connectWebSocket, connectSSE]);

  // Manual disconnect
  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    
    if (connectionRef.current) {
      if (type === 'websocket') {
        connectionRef.current.close();
      } else {
        connectionRef.current.close();
      }
      connectionRef.current = null;
    }
    
    setIsConnected(false);
    onDisconnect?.();
  }, [type, clearReconnectTimeout, onDisconnect]);

  // Send message (WebSocket only)
  const sendMessage = useCallback((message) => {
    if (type === 'websocket' && connectionRef.current?.readyState === WebSocket.OPEN) {
      connectionRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [type]);

  // Initialize connection
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    data,
    isConnected,
    error,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage: type === 'websocket' ? sendMessage : undefined,
  };
};

/**
 * Hook for stories-specific real-time updates
 */
export const useStoriesRealtime = (options = {}) => {
  return useRealtime('/api/realtime/stories', {
    ...options,
    queryClient: options.queryClient,
  });
};

/**
 * Hook for pipeline-specific real-time updates
 */
export const usePipelineRealtime = (options = {}) => {
  return useRealtime('/api/realtime/pipeline', {
    ...options,
    queryClient: options.queryClient,
  });
};
