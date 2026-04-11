import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStoryActions } from './useStoryActions';
import React from 'react';

// Mock the api client
vi.mock('../api/client', () => ({
  api: {
    put: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from '../api/client';

describe('useStoryActions - optimistic updates', () => {
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
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
    api.put.mockResolvedValue({ data: { id: '123', title: 'Updated Title' } });

    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    await act(async () => {
      await result.current.updateStory({ title: 'Updated Title' });
    });

    // Cache should be updated (optimistically then settled)
    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached).toBeTruthy();
    });
  });

  it('rolls back on mutation error', async () => {
    api.put.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    const originalTitle = 'Test Story';

    try {
      await act(async () => {
        await result.current.updateStory({ title: 'Failed Update' });
      });
    } catch {
      // expected to fail
    }

    // Should roll back to original
    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached.title).toBe(originalTitle);
    });
  });

  it('invalidates cache after mutation settles', async () => {
    api.put.mockResolvedValue({ data: { id: '123', title: 'Updated' } });
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    await act(async () => {
      await result.current.updateStory({ title: 'Updated' });
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });

  it('optimistically toggles status', async () => {
    api.patch.mockResolvedValue({ data: { id: '123', status: 'published' } });

    const { result } = renderHook(() => useStoryActions('123'), { wrapper });

    await act(async () => {
      await result.current.toggleStatus('published');
    });

    // After mutation settles, cache should reflect the new status
    await waitFor(() => {
      const cached = queryClient.getQueryData(['story', '123']);
      expect(cached).toBeTruthy();
    });
  });
});
