import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * appStore — global UI state for AI Pulse Pro.
 *
 * Contains:
 *   - activeTheme: resolved light/dark theme
 *   - activeSource: selected source filter
 *   - filters: dashboard filter state
 *   - bulkOperationState: progress overlay state
 *   - bulkOperationError: error reporting state
 *
 * Persist Policy (via zustand-persist):
 *   - theme: persisted to localStorage (survives reload)
 *   - activeSource: NOT persisted (refresh resets to all sources)
 *   - filters: NOT persisted (refresh resets filters)
 *   - bulk state: NOT persisted (transient UI state)
 *
 * Note: selectedIds stays in useBulkSelection hook (well-encapsulated, handles toggle/selectAll logic).
 */
export const useAppStore = create(
  persist(
    (set) => ({
      // ── Theme (persisted) ────────────────────────────────────────────────────
      activeTheme: (() => {
        const saved = localStorage.getItem('pulse-theme') || 'system';
        if (saved === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return saved;
      })(),
      setActiveTheme: (theme) => set({ activeTheme: theme }),

      // ── Source filter (not persisted) ─────────────────────────────────────────
      activeSource: null,
      setActiveSource: (source) => set({ activeSource: source }),

      // ── Dashboard filters (not persisted) ───────────────────────────────────
      filters: {
        source: '',
        scoreRange: '',
        dateRange: '',
        hasContent: false,
        analyzed: false,
        deepDive: false,
      },
      setFilters: (filtersOrUpdater) => set((state) => ({
        filters: typeof filtersOrUpdater === 'function'
          ? filtersOrUpdater(state.filters)
          : filtersOrUpdater,
      })),

      // ── Bulk operation state (not persisted - transient) ────────────────────
      bulkOperationState: {
        isActive: false,
        operationName: '',
        current: 0,
        total: 0,
      },
      setBulkOperationState: (stateOrUpdater) => set((state) => ({
        bulkOperationState: typeof stateOrUpdater === 'function'
          ? stateOrUpdater(state.bulkOperationState)
          : stateOrUpdater,
      })),

      // ── Bulk operation error (not persisted - transient) ────────────────────
      bulkOperationError: {
        isVisible: false,
        operationName: '',
        failedArticles: [],
        retryHandler: null,
      },
      setBulkOperationError: (errorOrUpdater) => set((state) => ({
        bulkOperationError: typeof errorOrUpdater === 'function'
          ? errorOrUpdater(state.bulkOperationError)
          : errorOrUpdater,
      })),
    }),
    {
      name: 'pulse-pro-store',
      partialize: (state) => ({ activeTheme: state.activeTheme }), // Only persist theme
    }
  )
);
