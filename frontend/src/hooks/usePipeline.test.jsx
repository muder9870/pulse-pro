import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePipeline, PipelineProvider } from '../context/PipelineContext';
import React from 'react';

describe('usePipeline / SSE', () => {
  let mockEventSource = null;

  beforeEach(() => {
    // Mock EventSource
    mockEventSource = {
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
    };
    
    global.EventSource = vi.fn(() => mockEventSource);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects to SSE endpoint on mount', () => {
    renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    expect(global.EventSource).toHaveBeenCalledWith('/api/pipeline/stream');
  });

  it('updates status on SSE message', async () => {
    const { result } = renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    // Simulate SSE message
    mockEventSource.onmessage({
      data: JSON.stringify({
        type: 'status',
        data: { stage: 'fetching', message: 'Fetching articles...', progress: 50, total: 100 }
      })
    });

    await waitFor(() => {
      expect(result.current.stage).toBe('fetching');
      expect(result.current.message).toBe('Fetching articles...');
      expect(result.current.progress).toBe(50);
    });
  });

  it('handles SSE connection error and shows retry message', async () => {
    global.fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ stage: 'idle', message: 'Pipeline idle' })
    });

    const { result } = renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    // Simulate error
    mockEventSource.onerror();

    await waitFor(() => {
      expect(result.current.connectionState).toBe('error');
      expect(result.current.message).toBe('Connection lost, retrying...');
    });
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    unmount();
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it('retries connection after error', async () => {
    vi.useFakeTimers();
    
    renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    // First connection attempt
    expect(global.EventSource).toHaveBeenCalledTimes(1);

    // Simulate error
    mockEventSource.onerror();

    // Fast-forward past retry timeout
    vi.advanceTimersByTime(5000);

    // Should have attempted reconnection
    expect(global.EventSource).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('provides connection state', () => {
    const { result } = renderHook(() => usePipeline(), {
      wrapper: ({ children }) => <PipelineProvider>{children}</PipelineProvider>,
    });

    expect(result.current.connectionState).toBeDefined();
    expect(['connecting', 'connected', 'error']).toContain(result.current.connectionState);
  });
});
