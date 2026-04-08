import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useStoryActions from './useStoryActions';
import React from 'react';

describe('useStoryActions - optimistic updates', () => {
  let queryClient;
  let mockUpdateStory;
  let mockToggleStatus;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    
    // Pre-populate cache
    queryClient.setQueryData(['story', '123'], {
      id: '123',
      title: 'Test Story',
      status: 'draft',
      content: 'Original content'
    });
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('optimistically updates story data', async () => {
    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    // Trigger optimistic update
    result.current.updateStory.mutate({ title: 'Updated Title' });

    // Cache should be updated immediately (optimistically)
    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached.title).toBe('Updated Title');
    });
  });

  it('rolls back on mutation error', async () => {
    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    const originalTitle = 'Test Story';

    // Set up mutation to fail
    result.current.updateStory.mutate({ title: 'Failed Update' });

    // Simulate error
    result.current.updateStory.onError?.();

    // Should roll back to original
    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached.title).toBe(originalTitle);
    });
  });

  it('invalidates cache after mutation settles', async () => {
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');
    
    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    result.current.updateStory.mutate({ title: 'Updated' });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalledWith(['story', '123']);
    });
  });

  it('optimistically toggles status', async () => {
    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    result.current.toggleStatus.mutate();

    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached.status).toBe('published'); // toggled from draft
    });
  });
});
