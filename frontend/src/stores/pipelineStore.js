import { create } from 'zustand';

/**
 * Pipeline Store - Zustand
 * 
 * ARCHITECTURE NOTE: React Query vs Zustand Boundary
 * - React Query owns: All server state (pipeline status, stories data)
 * - Zustand (this store) owns: UI-only state (queue management, error logs, client-side processing state)
 * 
 * Pipeline status comes from PipelineContext (SSE) or React Query, NOT this store.
 * This store manages the UI-side queue for bulk operations and client-side error tracking.
 */

const usePipelineStore = create((set, get) => ({
  // Pipeline state
  status: {
    stage: 'idle',
    message: 'Pipeline is idle',
    progress: 0,
    total: 0,
    active: false,
  },

  // Processing queue
  queue: {
    pending: [],
    processing: [],
    completed: [],
    failed: [],
  },

  // Errors and logs
  errors: [],
  logs: [],

  // Actions
  setPipelineStatus: (status) =>
    set((state) => ({
      status: { ...state.status, ...status },
    })),

  addToQueue: (items, type = 'pending') =>
    set((state) => ({
      queue: {
        ...state.queue,
        [type]: [...state.queue[type], ...items],
      },
    })),

  moveToProcessing: (itemIds) =>
    set((state) => {
      const pending = state.queue.pending.filter((item) => !itemIds.includes(item.id));
      const processing = [
        ...state.queue.processing,
        ...state.queue.pending.filter((item) => itemIds.includes(item.id)),
      ];
      return {
        queue: { ...state.queue, pending, processing },
      };
    }),

  moveToCompleted: (itemIds) =>
    set((state) => {
      const processing = state.queue.processing.filter((item) => !itemIds.includes(item.id));
      const completed = [
        ...state.queue.completed,
        ...state.queue.processing.filter((item) => itemIds.includes(item.id)),
      ];
      return {
        queue: { ...state.queue, processing, completed },
      };
    }),

  moveToFailed: (itemIds) =>
    set((state) => {
      const processing = state.queue.processing.filter((item) => !itemIds.includes(item.id));
      const failed = [
        ...state.queue.failed,
        ...state.queue.processing.filter((item) => itemIds.includes(item.id)),
      ];
      return {
        queue: { ...state.queue, processing, failed },
      };
    }),

  addError: (error) =>
    set((state) => ({
      errors: [...state.errors, { ...error, id: Date.now(), timestamp: new Date().toISOString() }],
    })),

  clearErrors: () =>
    set({ errors: [] }),

  addLog: (log) =>
    set((state) => ({
      logs: [...state.logs, { ...log, id: Date.now(), timestamp: new Date().toISOString() }],
    })),

  clearLogs: () =>
    set({ logs: [] }),

  resetQueue: () =>
    set({
      queue: {
        pending: [],
        processing: [],
        completed: [],
        failed: [],
      },
    }),

  // Computed selectors
  getQueueStats: () => {
    const { queue } = get();
    return {
      pending: queue.pending.length,
      processing: queue.processing.length,
      completed: queue.completed.length,
      failed: queue.failed.length,
      total: queue.pending.length + queue.processing.length + queue.completed.length + queue.failed.length,
    };
  },

  getProgressPercentage: () => {
    const { status } = get();
    if (status.total === 0) return 0;
    return Math.round((status.progress / status.total) * 100);
  },

  isActive: () => get().status.active,
}));

export { usePipelineStore };
