import React, { createContext, useContext, useState, useEffect } from 'react';

const PipelineContext = createContext(null);

/**
 * PipelineProvider — opens exactly ONE SSE connection to /api/pipeline/stream.
 * All components that call usePipeline() share this single connection.
 *
 * Previously every usePipeline() call opened its own EventSource, so
 * PipelineStatus and App.jsx both had live connections simultaneously.
 */
export const PipelineProvider = ({ children }) => {
  const [status, setStatus] = useState({
    stage: 'idle',
    message: 'Pipeline is idle',
    progress: 0,
    total: 0,
    active: false,
  });
  const [connectionState, setConnectionState] = useState('connecting'); // 'connecting' | 'connected' | 'error'

  useEffect(() => {
    let eventSource = null;
    let reconnectTimeout = null;

    const connect = () => {
      if (eventSource) eventSource.close();
      setConnectionState('connecting');

      eventSource = new EventSource('/api/pipeline/stream');

      eventSource.onopen = () => {
        setConnectionState('connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'status') {
            const { stage, message, progress, total } = payload.data;
            setStatus({
              stage,
              message,
              progress: progress || 0,
              total: total || 0,
              active: stage !== 'done',
            });
          }
        } catch (err) {
          console.error('SSE Parse Error:', err);
        }
      };

      eventSource.onerror = () => {
        setConnectionState('error');
        eventSource.close();
        // Fallback polling after SSE error with retry message
        setStatus((prev) => ({
          ...prev,
          message: 'Connection lost, retrying...',
        }));
        reconnectTimeout = setTimeout(() => {
          fetch('/api/pipeline/status')
            .then((r) => r.json())
            .then((data) => setStatus((prev) => ({ ...prev, ...data, message: data.message || prev.message })))
            .catch(() => {});
          connect(); // Retry SSE connection
        }, 5000);
      };
    };

    connect();
    return () => { 
      if (eventSource) eventSource.close(); 
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <PipelineContext.Provider value={{ ...status, connectionState }}>
      {children}
    </PipelineContext.Provider>
  );
};

/**
 * usePipeline — reads pipeline status from the shared context.
 * Must be used inside <PipelineProvider>.
 */
export const usePipeline = () => {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used inside <PipelineProvider>');
  return ctx;
};
