import { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

/**
 * usePipelineRun - Hook for managing pipeline execution and polling
 * 
 * Handles pipeline run initiation, status polling, and timeout management.
 * Extracted from App.jsx as part of T9 refactoring.
 * 
 * @param {Object} options - Configuration options
 * @param {Function} options.onSuccess - Callback when pipeline completes successfully
 * @param {Function} options.onError - Callback when pipeline fails or times out
 * @param {Function} options.onPartialSuccess - Callback when pipeline completes with some errors
 * @returns {Object} Pipeline state and control functions
 */
export function usePipelineRun({ onSuccess, onError, onPartialSuccess } = {}) {
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineElapsed, setPipelineElapsed] = useState(0);
  const [pollTimeoutId, setPollTimeoutId] = useState(null);

  // Check pipeline status on mount to detect scheduler-triggered runs
  useEffect(() => {
    const checkInitialStatus = async () => {
      try {
        const statusResp = await apiFetch('/pipeline/status');
        if (statusResp.ok) {
          const data = await statusResp.json();
          if (data.running) {
            // Pipeline is already running (likely triggered by scheduler)
            setPipelineRunning(true);
            
            // Calculate elapsed time from last_started_at
            if (data.last_started_at) {
              const startTime = new Date(data.last_started_at).getTime();
              const elapsed = Math.floor((Date.now() - startTime) / 1000);
              setPipelineElapsed(elapsed);
            }
            
            // Start polling
            startPolling(data.last_started_at ? new Date(data.last_started_at).getTime() : Date.now());
          }
        }
      } catch (error) {
        console.error('Failed to check initial pipeline status:', error);
      }
    };

    checkInitialStatus();

    // Cleanup on unmount
    return () => {
      if (pollTimeoutId) {
        clearTimeout(pollTimeoutId);
      }
    };
  }, []);

  const startPolling = (startTime) => {
    const TIMEOUT_SECONDS = 5 * 60;  // 5 minutes
    const POLL_INTERVAL = 2000;      // 2 seconds

    const poll = async () => {
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      setPipelineElapsed(elapsedSeconds);

      if (elapsedSeconds >= TIMEOUT_SECONDS) {
        setPipelineRunning(false);
        onError?.(`Pipeline timed out after ${TIMEOUT_SECONDS} seconds. Check logs for details.`);
        return;
      }

      try {
        const statusResp = await apiFetch('/pipeline/status');
        if (!statusResp.ok) {
          onError?.('Failed to fetch pipeline status');
          setPipelineRunning(false);
          return;
        }

        const data = await statusResp.json();
        const status = data.status;
        const lastError = data.last_error;

        if (status === 'success') {
          setPipelineRunning(false);
          if (data.partial_success) {
            onPartialSuccess?.('Pipeline completed with some errors. Data fetched successfully.');
          } else {
            onSuccess?.('Pipeline completed successfully');
          }
          return;
        }

        if (status === 'error') {
          setPipelineRunning(false);
          onError?.(`Pipeline failed: ${lastError || 'Unknown error'}`);
          return;
        }

        // Still running — schedule next poll
        const timeoutId = setTimeout(poll, POLL_INTERVAL);
        setPollTimeoutId(timeoutId);

      } catch (pollError) {
        setPipelineRunning(false);
        onError?.(`Pipeline status check failed: ${pollError.message}`);
      }
    };

    // Start first poll after initial interval
    const timeoutId = setTimeout(poll, POLL_INTERVAL);
    setPollTimeoutId(timeoutId);
  };

  const handleRunPipeline = async () => {
    try {
      const response = await apiFetch('/pipeline/run', { method: 'POST' });
      if (!response.ok) {
        onError?.('Failed to start pipeline');
        return;
      }

      setPipelineRunning(true);
      setPipelineElapsed(0);

      const startTime = Date.now();
      startPolling(startTime);

    } catch (error) {
      setPipelineRunning(false);
      onError?.(`Pipeline error: ${error.message}`);
    }
  };

  return {
    pipelineRunning,
    pipelineElapsed,
    handleRunPipeline,
  };
}

export default usePipelineRun;
