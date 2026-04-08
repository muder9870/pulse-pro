import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global App Store - Zustand
 * 
 * Manages global application state including:
 * - User preferences and settings
 * - UI state (sidebar, modals, etc.)
 * - Application-wide data
 */

const useAppStore = create(
  persist(
    (set, get) => ({
      // User preferences
      preferences: {
        theme: 'light',
        language: 'en',
        autoRefresh: true,
        refreshInterval: 30000, // 30 seconds
      },

      // UI state
      ui: {
        sidebarOpen: true,
        activeView: 'stories',
        modals: {
          story: null,
          settings: false,
          help: false,
        },
        notifications: [],
      },

      // Application data
      app: {
        lastSync: null,
        syncStatus: 'idle', // 'idle', 'syncing', 'success', 'error'
        version: '1.0.0',
      },

      // Actions
      setPreferences: (preferences) =>
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        })),

      toggleSidebar: () =>
        set((state) => ({
          ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen },
        })),

      setActiveView: (view) =>
        set((state) => ({
          ui: { ...state.ui, activeView: view },
        })),

      openModal: (modal, data = null) =>
        set((state) => ({
          ui: {
            ...state.ui,
            modals: { ...state.ui.modals, [modal]: data },
          },
        })),

      closeModal: (modal) =>
        set((state) => ({
          ui: {
            ...state.ui,
            modals: { ...state.ui.modals, [modal]: false },
          },
        })),

      addNotification: (notification) =>
        set((state) => ({
          ui: {
            ...state.ui,
            notifications: [...state.ui.notifications, { ...notification, id: Date.now() }],
          },
        })),

      removeNotification: (id) =>
        set((state) => ({
          ui: {
            ...state.ui,
            notifications: state.ui.notifications.filter((n) => n.id !== id),
          },
        })),

      setSyncStatus: (status) =>
        set((state) => ({
          app: { ...state.app, syncStatus: status, lastSync: new Date().toISOString() },
        })),

      resetState: () =>
        set({
          preferences: {
            theme: 'light',
            language: 'en',
            autoRefresh: true,
            refreshInterval: 30000,
          },
          ui: {
            sidebarOpen: true,
            activeView: 'stories',
            modals: {
              story: null,
              settings: false,
              help: false,
            },
            notifications: [],
          },
          app: {
            lastSync: null,
            syncStatus: 'idle',
            version: '1.0.0',
          },
        }),
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ preferences: state.preferences, ui: { sidebarOpen: state.ui.sidebarOpen } }),
    }
  )
);

export { useAppStore };
