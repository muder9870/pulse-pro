import { create } from 'zustand';

/**
 * Stories Store - Zustand
 * 
 * Manages stories-related state including:
 * - Story filters and search
 * - Selection state
 * - View preferences
 */

const useStoriesStore = create((set, get) => ({
  // Filters
  filters: {
    search: '',
    source: '',
    platform: '',
    status: '',
    dateRange: null,
    tags: [],
  },

  // Selection
  selectedStories: new Set(),
  selectionMode: false,

  // View preferences
  view: {
    layout: 'grid', // 'grid', 'list'
    sortBy: 'score', // 'score', 'date', 'title'
    sortOrder: 'desc', // 'asc', 'desc'
    pageSize: 12,
    currentPage: 1,
  },

  // Actions
  setFilters: (filters) =>
    set((state) => ({
      filters: { ...state.filters, ...filters },
      view: { ...state.view, currentPage: 1 }, // Reset to first page
    })),

  clearFilters: () =>
    set({
      filters: {
        search: '',
        source: '',
        platform: '',
        status: '',
        dateRange: null,
        tags: [],
      },
    }),

  setView: (view) =>
    set((state) => ({
      view: { ...state.view, ...view },
    })),

  toggleSelection: (storyId) =>
    set((state) => {
      const newSelected = new Set(state.selectedStories);
      if (newSelected.has(storyId)) {
        newSelected.delete(storyId);
      } else {
        newSelected.add(storyId);
      }
      return { selectedStories: newSelected };
    }),

  selectAll: (storyIds) =>
    set({ selectedStories: new Set(storyIds) }),

  clearSelection: () =>
    set({ selectedStories: new Set(), selectionMode: false }),

  toggleSelectionMode: () =>
    set((state) => ({
      selectionMode: !state.selectionMode,
      selectedStories: !state.selectionMode ? new Set() : state.selectedStories,
    })),

  // Computed selectors
  hasActiveFilters: () => {
    const { filters } = get();
    return (
      filters.search ||
      filters.source ||
      filters.platform ||
      filters.status ||
      filters.dateRange ||
      filters.tags.length > 0
    );
  },

  getSelectedCount: () => get().selectedStories.size,

  isStorySelected: (storyId) => get().selectedStories.has(storyId),
}));

export { useStoriesStore };
