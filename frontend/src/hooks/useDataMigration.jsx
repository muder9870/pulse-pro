import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * Data Migration Hook
 * 
 * Handles migration of data from old frontend format to new format:
 * - Story data transformation
 * - User preferences migration
 * - Settings and configuration migration
 * - Progress tracking and rollback
 */

export const useDataMigration = () => {
  const [migrationStatus, setMigrationStatus] = useState('idle'); // idle, running, completed, error
  const [migrationProgress, setMigrationProgress] = useState(0);
  const [migrationErrors, setMigrationErrors] = useState([]);
  const [migrationResults, setMigrationResults] = useState(null);

  // Check if migration is needed
  const { data: migrationNeeded } = useQuery({
    queryKey: ['migration-needed'],
    queryFn: async () => {
      try {
        const response = await api.get('/api/migration/check');
        return response.data;
      } catch (error) {
        console.error('Error checking migration status:', error);
        return false;
      }
    },
    retry: false,
  });

  // Start migration process
  const startMigration = async () => {
    setMigrationStatus('running');
    setMigrationProgress(0);
    setMigrationErrors([]);
    setMigrationResults(null);

    try {
      // Step 1: Migrate stories
      const storiesResult = await migrateStories();
      setMigrationProgress(25);

      // Step 2: Migrate user preferences
      const preferencesResult = await migrateUserPreferences();
      setMigrationProgress(50);

      // Step 3: Migrate settings
      const settingsResult = await migrateSettings();
      setMigrationProgress(75);

      // Step 4: Validate migration
      const validationResult = await validateMigration();
      setMigrationProgress(100);

      setMigrationResults({
        stories: storiesResult,
        preferences: preferencesResult,
        settings: settingsResult,
        validation: validationResult
      });

      setMigrationStatus('completed');
    } catch (error) {
      console.error('Migration failed:', error);
      setMigrationErrors([error.message]);
      setMigrationStatus('error');
    }
  };

  // Migrate stories data
  const migrateStories = async () => {
    try {
      const response = await api.post('/api/migration/stories');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to migrate stories: ${error.message}`);
    }
  };

  // Migrate user preferences
  const migrateUserPreferences = async () => {
    try {
      const response = await api.post('/api/migration/preferences');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to migrate preferences: ${error.message}`);
    }
  };

  // Migrate settings
  const migrateSettings = async () => {
    try {
      const response = await api.post('/api/migration/settings');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to migrate settings: ${error.message}`);
    }
  };

  // Validate migration results
  const validateMigration = async () => {
    try {
      const response = await api.get('/api/migration/validate');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to validate migration: ${error.message}`);
    }
  };

  // Rollback migration
  const rollbackMigration = async () => {
    setMigrationStatus('running');
    setMigrationProgress(0);

    try {
      const response = await api.post('/api/migration/rollback');
      setMigrationStatus('idle');
      return response.data;
    } catch (error) {
      console.error('Rollback failed:', error);
      setMigrationErrors([error.message]);
      setMigrationStatus('error');
      throw error;
    }
  };

  // Reset migration state
  const resetMigration = () => {
    setMigrationStatus('idle');
    setMigrationProgress(0);
    setMigrationErrors([]);
    setMigrationResults(null);
  };

  return {
    migrationStatus,
    migrationProgress,
    migrationErrors,
    migrationResults,
    migrationNeeded,
    startMigration,
    rollbackMigration,
    resetMigration,
  };
};

/**
 * Data Transformation Utilities
 */

// Transform old story format to new format
export const transformStoryData = (oldStory) => {
  return {
    id: oldStory.id || `story-${Date.now()}`,
    title: oldStory.title || oldStory.headline || '',
    content: oldStory.content || oldStory.body || oldStory.description || '',
    score: oldStory.score || oldStory.priority || 50,
    status: normalizeStatus(oldStory.status || oldStory.state),
    source: oldStory.source || oldStory.platform || 'unknown',
    url: oldStory.url || oldStory.link || '',
    publishedAt: normalizeDate(oldStory.publishedAt || oldStory.date || oldStory.created_at),
    tags: normalizeTags(oldStory.tags || oldStory.categories || []),
    platforms: normalizePlatforms(oldStory.platforms || []),
    metadata: {
      wordCount: oldStory.wordCount || oldStory.word_count || 0,
      readingTime: oldStory.readingTime || oldStory.reading_time || 0,
      ...oldStory.metadata
    },
    createdAt: normalizeDate(oldStory.createdAt || oldStory.created_at),
    updatedAt: normalizeDate(oldStory.updatedAt || oldStory.updated_at),
  };
};

// Normalize status values
const normalizeStatus = (status) => {
  const statusMap = {
    'draft': 'pending',
    'published': 'completed',
    'archived': 'archived',
    'deleted': 'deleted',
    'new': 'pending',
    'processed': 'completed',
    'failed': 'failed'
  };

  return statusMap[status?.toLowerCase()] || 'pending';
};

// Normalize date values
const normalizeDate = (date) => {
  if (!date) return new Date().toISOString();
  
  if (typeof date === 'string') {
    return new Date(date).toISOString();
  }
  
  if (date instanceof Date) {
    return date.toISOString();
  }
  
  return new Date().toISOString();
};

// Normalize tags
const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  
  return tags
    .filter(tag => tag && typeof tag === 'string')
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 0);
};

// Normalize platforms
const normalizePlatforms = (platforms) => {
  if (!Array.isArray(platforms)) return [];
  
  const platformMap = {
    'twitter': 'Twitter',
    'x': 'Twitter',
    'linkedin': 'LinkedIn',
    'facebook': 'Facebook',
    'instagram': 'Instagram',
    'reddit': 'Reddit'
  };

  return platforms
    .filter(platform => platform && typeof platform === 'string')
    .map(platform => platformMap[platform.toLowerCase()] || platform)
    .filter(platform => platform);
};

// Transform user preferences
export const transformUserPreferences = (oldPreferences) => {
  return {
    theme: oldPreferences.theme || oldPreferences.appearance?.theme || 'light',
    language: oldPreferences.language || oldPreferences.locale || 'en',
    notifications: {
      email: oldPreferences.notifications?.email || true,
      push: oldPreferences.notifications?.push || false,
      desktop: oldPreferences.notifications?.desktop || false,
      ...oldPreferences.notifications
    },
    ui: {
      sidebarCollapsed: oldPreferences.ui?.sidebarCollapsed || false,
      compactMode: oldPreferences.ui?.compactMode || false,
      showTooltips: oldPreferences.ui?.showTooltips !== false,
      ...oldPreferences.ui
    },
    privacy: {
      analytics: oldPreferences.privacy?.analytics !== false,
      cookies: oldPreferences.privacy?.cookies !== false,
      tracking: oldPreferences.privacy?.tracking || false,
      ...oldPreferences.privacy
    },
    ...oldPreferences
  };
};

// Transform settings
export const transformSettings = (oldSettings) => {
  return {
    general: {
      siteName: oldSettings.siteName || oldSettings.name || 'Pulse Pro',
      siteUrl: oldSettings.siteUrl || oldSettings.url || 'https://pulsepro.app',
      timezone: oldSettings.timezone || oldSettings.defaultTimezone || 'UTC',
      language: oldSettings.language || oldSettings.defaultLanguage || 'en',
      ...oldSettings.general
    },
    features: {
      enableRealtime: oldSettings.enableRealtime !== false,
      enableOffline: oldSettings.enableOffline !== false,
      enableAnalytics: oldSettings.enableAnalytics !== false,
      enableNotifications: oldSettings.enableNotifications !== false,
      ...oldSettings.features
    },
    api: {
      baseUrl: oldSettings.api?.baseUrl || oldSettings.apiUrl || '/api',
      timeout: oldSettings.api?.timeout || oldSettings.requestTimeout || 30000,
      retries: oldSettings.api?.retries || oldSettings.maxRetries || 3,
      ...oldSettings.api
    },
    ...oldSettings
  };
};

/**
 * Migration Progress Component
 */
export const MigrationProgress = ({ migrationStatus, migrationProgress, migrationErrors }) => {
  if (migrationStatus === 'idle') return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Data Migration</h3>
        
        {migrationStatus === 'running' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium">{migrationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${migrationProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">
              Migrating your data from the old frontend format...
            </p>
          </div>
        )}

        {migrationStatus === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-green-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Migration Completed</span>
            </div>
            <p className="text-sm text-gray-600">
              Your data has been successfully migrated to the new format.
            </p>
          </div>
        )}

        {migrationStatus === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-red-600">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Migration Failed</span>
            </div>
            <div className="space-y-2">
              {migrationErrors.map((error, index) => (
                <p key={index} className="text-sm text-red-600">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
