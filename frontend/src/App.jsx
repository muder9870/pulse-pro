import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SkipLink from './components/SkipLink';
import ToastContainer from './components/ToastContainer';
import QuickActions from './components/QuickActions';
import Skeleton from './components/Skeleton';
import { Button } from './components/ui';
import { ToastProvider, useToastContext } from './hooks/useToast';
import { AudioProvider } from './context/AudioContext';
import { useBulkSelection } from './hooks/useBulkSelection';
import { useStories, useSources } from './hooks/useStories';
import { usePipeline } from './hooks/usePipeline';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from './store/appStore';
// View components — lazy loaded per route to reduce initial bundle size
const AnalyticsView = lazy(() => import('./views/AnalyticsView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const MediaView = lazy(() => import('./views/MediaView'));
const PodcastView = lazy(() => import('./views/PodcastView'));
const ResearchView = lazy(() => import('./views/ResearchView'));
const SettingsView = lazy(() => import('./views/SettingsView'));
const NotFoundView = lazy(() => import('./views/NotFoundView'));
// Dev-only routes — lazy loaded and excluded from production builds
const DevToolsView = lazy(() => import('./views/DevToolsView'));
const ThemeExample = lazy(() => import('./theme/ThemeExample'));
const TokenReference = lazy(() => import('./views/TokenReference'));
// DashboardView is the default route — eager loaded for instant first paint
import DashboardView from './views/DashboardView';
import {
  Menu,
  X,
  Zap,
  Trash2,
  RefreshCw,
  Search
} from 'lucide-react';

function AppContent() {
  const toast = useToastContext();
  const queryClient = useQueryClient();

  const navigate = useNavigate();
  const location = useLocation();

  // Derive currentView from the URL path so all existing logic that reads
  // currentView keeps working without changes. The URL is the source of truth.
  const pathToView = (pathname) => {
    const seg = pathname.replace(/^\//, '') || 'dashboard';
    return seg;
  };
  const currentView = pathToView(location.pathname);
  const setCurrentView = (view) => navigate(view === 'dashboard' ? '/' : `/${view}`);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Zustand store — theme, source filter, dashboard filters
  const activeTheme = useAppStore((s) => s.activeTheme);
  const activeSource = useAppStore((s) => s.activeSource);
  const setActiveSource = useAppStore((s) => s.setActiveSource);
  const filters = useAppStore((s) => s.filters);
  const setFilters = useAppStore((s) => s.setFilters);

  // 2. Data fetching hooks that depend on the state above
  const {
    data: storiesData,
    isLoading: loading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useStories({
    sort: 'score',
    source: activeSource
  });
  // Flatten all pages into a single array
  const stories = storiesData?.pages?.flat() ?? [];

  const { data: fetchedSources = [] } = useSources();
  
  const pipelineStatus = usePipeline();
  
  // Initialize bulk selection hook
  const {
    selectedIds,
    toggleItem: toggleSelection,
    toggleAll,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isSomeSelected
  } = useBulkSelection(stories, 'id');
  
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineElapsed, setPipelineElapsed] = useState(0);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleTime, setScheduleTime] = useState('11:00');
  const [scheduleDays, setScheduleDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
  const [scheduleNextRun, setScheduleNextRun] = useState(null);
  const [scheduleServerTime, setScheduleServerTime] = useState(null);
  const [scheduleError, setScheduleError] = useState(null);
  
  // Handle source changes from sidebar
  const handleSourceSelect = (source) => {
    setActiveSource(source);
    setCurrentView('dashboard');
    // We intentionally do NOT wipe setFilters() or setSearchQuery() here
    // so that "Dashboard Tuning and Perspective" (FilterBar) settings persist
    // across different sources!
  };
  
  // Bulk operation state — from Zustand store
  const bulkOperationState = useAppStore((s) => s.bulkOperationState);
  const setBulkOperationState = useAppStore((s) => s.setBulkOperationState);
  const bulkOperationError = useAppStore((s) => s.bulkOperationError);
  const setBulkOperationError = useAppStore((s) => s.setBulkOperationError);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const dayOptions = [
    { key: 'mon', label: 'Mon' },
    { key: 'tue', label: 'Tue' },
    { key: 'wed', label: 'Wed' },
    { key: 'thu', label: 'Thu' },
    { key: 'fri', label: 'Fri' },
    { key: 'sat', label: 'Sat' },
    { key: 'sun', label: 'Sun' },
  ];

  // Handle deep dive request from daily intelligence
  useEffect(() => {
    const handleOpenStory = (e) => {
      const { title } = e.detail;
      // Find article by title or some other criteria
      const story = stories.find(s => s.title === title);
      if (story) {
        // Find the article's position and maybe scroll to it or open its details
        // For now, let's just search for it and highlight it or open research view
        setCurrentView('dashboard');
        setSearchQuery(title);
        // Clear all other filters when diving into a specific story
        setActiveSource(null);
        setFilters({
          source: '',
          scoreRange: '',
          dateRange: '',
          hasContent: false,
          analyzed: false
        });
        // We could also open a detail view if we had one
        console.log(`Deep dive into: ${title}`);
      }
    };
    window.addEventListener('open-story-details', handleOpenStory);
    return () => window.removeEventListener('open-story-details', handleOpenStory);
  }, [stories]);

  // Handle dashboard stats clicks
  useEffect(() => {
    const handleStatsFilter = (e) => {
      const { filter } = e.detail;
      setCurrentView('dashboard');
      setSearchQuery('');
      setActiveSource(null);
      
      setFilters({
        source: '',
        scoreRange: '',
        dateRange: '',
        hasContent: false,
        analyzed: false,
        deepDive: false
      });

      if (filter === 'all') {
        return;
      }

      setFilters(prev => {
        const updated = { ...prev };
        if (filter === 'analyzed') {
          updated.analyzed = true;
        } else if (filter === 'hasContent') {
          updated.hasContent = true;
        } else if (filter === 'deepDive') {
          updated.deepDive = true;
        } else if (filter === 'score') {
          updated.scoreRange = '85-100';
        }
        return updated;
      });
    };
    window.addEventListener('dashboard-filter', handleStatsFilter);
    return () => window.removeEventListener('dashboard-filter', handleStatsFilter);
  }, []);

  const fetchStories = () => {
    queryClient.invalidateQueries(['stories']);
  };

  const handleRunPipeline = async () => {
    const TIMEOUT_SECONDS = 5 * 60;  // 5 minutes
    const POLL_INTERVAL = 2000;      // 2 seconds

    try {
        const response = await fetch('/api/pipeline/run', { method: 'POST' });
        if (!response.ok) {
            toast.error('Failed to start pipeline');
            return;
        }

        setPipelineRunning(true);
        setPipelineElapsed(0);

        const startTime = Date.now();

        const poll = async () => {
            const elapsedMs = Date.now() - startTime;
            const elapsedSeconds = Math.floor(elapsedMs / 1000);
            setPipelineElapsed(elapsedSeconds);

            if (elapsedSeconds >= TIMEOUT_SECONDS) {
                setPipelineRunning(false);
                toast.error(`Pipeline timed out after ${TIMEOUT_SECONDS} seconds. Check logs for details.`);
                return;
            }

            try {
                const statusResp = await fetch('/api/pipeline/status');
                if (!statusResp.ok) {
                    toast.error('Failed to fetch pipeline status');
                    setPipelineRunning(false);
                    return;
                }

                const data = await statusResp.json();
                const status = data.status;
                const lastError = data.last_error;

                if (status === 'success') {
                    setPipelineRunning(false);
                    if (data.partial_success) {
                        toast.success('Pipeline completed with some errors. Data fetched successfully.');
                    } else {
                        toast.success('Pipeline completed successfully');
                    }
                    return;
                }

                if (status === 'error') {
                    setPipelineRunning(false);
                    toast.error(`Pipeline failed: ${lastError || 'Unknown error'}`);
                    return;
                }

                // Still running — schedule next poll
                setTimeout(poll, POLL_INTERVAL);

            } catch (pollError) {
                setPipelineRunning(false);
                toast.error(`Pipeline status check failed: ${pollError.message}`);
            }
        };

        // Start first poll after initial interval
        setTimeout(poll, POLL_INTERVAL);

    } catch (error) {
        setPipelineRunning(false);
        toast.error(`Pipeline error: ${error.message}`);
    }
  };

  const openSchedule = async () => {
    setScheduleOpen(true);
    setScheduleError(null);
    try {
      const res = await fetch('/api/schedule');
      if (!res.ok) throw new Error('Failed to load schedule');
      const data = await res.json();
      const sched = data.schedule || {};
      setScheduleEnabled(Boolean(sched.enabled));
      setScheduleTime(sched.time || '11:00');
      setScheduleDays(Array.isArray(sched.days) ? sched.days : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      setScheduleNextRun(data.next_run_time || null);
      setScheduleServerTime(data.server_time || null);
    } catch (e) {
      console.error(e);
      setScheduleError(String(e.message || e));
    }
  };

  const saveSchedule = async () => {
    setScheduleLoading(true);
    setScheduleError(null);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: scheduleEnabled,
          time: scheduleTime,
          days: scheduleDays,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save schedule');
      const info = data.info || {};
      setScheduleNextRun(info.next_run_time || null);
      setScheduleServerTime(info.server_time || null);
      setScheduleOpen(false);
    } catch (e) {
      console.error(e);
      setScheduleError(String(e.message || e));
    } finally {
      setScheduleLoading(false);
    }
  };

  const toggleDay = (dayKey) => {
    setScheduleDays((prev) => {
      if (prev.includes(dayKey)) return prev.filter((d) => d !== dayKey);
      return [...prev, dayKey];
    });
  };

  // Automatic cache invalidation when pipeline finishes
  useEffect(() => {
    if (pipelineStatus.stage === 'done') {
      console.log('Pipeline finished. Invalidating stories cache...');
      queryClient.invalidateQueries(['stories']);
    }
  }, [pipelineStatus.stage, queryClient]);

  // Clear selection when navigating away from dashboard (Requirement 1.4)
  useEffect(() => {
    if (currentView !== 'dashboard' && selectedIds.size > 0) {
      clearSelection();
    }
  }, [currentView, selectedIds.size, clearSelection]);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/export');
      const data = await res.json();
      if (data.markdown) {
        const blob = new Blob([data.markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-pulse-export-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error("Export failed", err);
    }
  };

  // Optimize story filtering with useMemo to prevent lag during re-renders
  const filteredStories = React.useMemo(() => {
    if (currentView !== 'dashboard') return [];
    
    let filtered = stories;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(story =>
        story.title?.toLowerCase().includes(query) ||
        story.source?.toLowerCase().includes(query) ||
        story.summary?.toLowerCase().includes(query) ||
        story.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    const activeSrc = activeSource || filters.source;
    if (activeSrc) {
      const sourceName = typeof activeSrc === 'string' ? activeSrc : activeSrc?.name;
      if (sourceName) {
        filtered = filtered.filter(story =>
          story.source?.toLowerCase().includes(sourceName.toLowerCase())
        );
      }
    }

    if (filters.scoreRange) {
      const [min, max] = filters.scoreRange.split('-').map(Number);
      filtered = filtered.filter(story => {
        const score = story.total_score || 0;
        return score >= min && score <= (max || 100);
      });
    }

    if (filters.dateRange) {
      const now = new Date();
      let startDate;
      switch (filters.dateRange) {
        case 'today':
        case '24h': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
        case 'week':
        case '7d': startDate = new Date(now.setDate(now.getDate() - 7)); break;
        case 'month':
        case '30d': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
        case 'year': startDate = new Date(now.setFullYear(now.getFullYear() - 1)); break;
        default: startDate = null;
      }
      if (startDate) {
        filtered = filtered.filter(story => {
          const storyDate = new Date(story.fetched_at || story.published_at || story.created_at);
          return storyDate >= startDate;
        });
      }
    }

    if (filters.hasContent) filtered = filtered.filter(story => story.posts && story.posts.length > 0);
    if (filters.analyzed) filtered = filtered.filter(story => story.summary && story.summary.length > 0);
    if (filters.deepDive) filtered = filtered.filter(story => story.has_deep_analysis === true);

    filtered.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    return filtered;
  }, [stories, searchQuery, activeSource, filters]);

  const uniqueSources = React.useMemo(() => 
    fetchedSources.length > 0 ? fetchedSources : [...new Set(stories.map(s => s.source))].filter(Boolean),
  [stories, fetchedSources]);

  // Handle Select All for filtered stories (Requirement 3.2, 3.3, 3.5)
  const handleSelectAllFiltered = React.useCallback(() => {
    const filteredIds = filteredStories.map(s => s.id);
    
    // Check if all filtered stories are selected
    const allFilteredSelected = filteredIds.every(id => selectedIds.has(id));
    
    if (allFilteredSelected) {
      // Deselect all filtered stories
      filteredIds.forEach(id => {
        if (selectedIds.has(id)) {
          toggleSelection(id);
        }
      });
    } else {
      // Select all filtered stories
      filteredIds.forEach(id => {
        if (!selectedIds.has(id)) {
          toggleSelection(id);
        }
      });
    }
  }, [filteredStories, selectedIds, toggleSelection]);

  // Calculate indeterminate state for Select All checkbox
  const getSelectAllState = React.useCallback(() => {
    const filteredIds = filteredStories.map(s => s.id);
    const selectedFilteredCount = filteredIds.filter(id => selectedIds.has(id)).length;
    
    return {
      checked: filteredStories.length > 0 && selectedFilteredCount === filteredStories.length,
      indeterminate: selectedFilteredCount > 0 && selectedFilteredCount < filteredStories.length
    };
  }, [filteredStories, selectedIds]);

  // Bulk action handlers
  const handleBulkGenerate = async (articleIdsOverride = null) => {
    const articleIds = articleIdsOverride || Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    // Track progress
    let successCount = 0;
    let failedArticles = [];
    const totalCount = articleIds.length;

    // Show loading overlay with progress (Requirements 10.1, 10.2)
    setBulkOperationState({
      isActive: true,
      operationName: 'Generating Content',
      current: 0,
      total: totalCount
    });

    try {
      // Process articles sequentially (Requirement 4.5)
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        
        // Update progress (Requirement 10.2)
        setBulkOperationState(prev => ({
          ...prev,
          current: i + 1
        }));
        
        try {
          // Call /api/generate endpoint for each article (Requirement 4.1)
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ article_id: articleId })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed with status ${response.status}`);
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to generate content for article ${articleId}:`, error);
          // Get article title for better error display
          const article = stories.find(s => s.id === articleId);
          failedArticles.push({ 
            id: articleId, 
            title: article?.title,
            error: error.message 
          });
        }
      }

      // Refresh article data after completion (Requirement 4.3)
      await fetchStories();

      // Show completion feedback (Requirements 4.3, 4.4, 10.3, 10.4, 10.5)
      if (failedArticles.length === 0) {
        toast.success(`Successfully generated content for ${successCount} article${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Generated ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Show error component with details of failed articles (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Content Generation',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkGenerate(failedArticles.map(a => a.id));
          }
        });
      } else {
        // All articles failed - show error component (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Content Generation',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkGenerate(failedArticles.map(a => a.id));
          }
        });
      }

    } catch (error) {
      console.error('Bulk generate error:', error);
      toast.error(`Bulk generation failed: ${error.message}`);
    } finally {
      // Hide loading overlay (Requirement 10.1)
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  const handleBulkSchedule = async (options, articleIdsOverride = null) => {
    const articleIds = articleIdsOverride || Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    if (!options.time || !options.platform) {
      toast.error('Please provide both time and platform');
      return;
    }

    // Track progress
    let successCount = 0;
    let failedArticles = [];
    const totalCount = articleIds.length;

    // Show loading overlay with progress (Requirements 10.1, 10.2)
    setBulkOperationState({
      isActive: true,
      operationName: 'Scheduling Articles',
      current: 0,
      total: totalCount
    });

    try {
      // Call /api/schedule/queue endpoint for each article (Requirement 5.3)
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        
        // Update progress (Requirement 10.2)
        setBulkOperationState(prev => ({
          ...prev,
          current: i + 1
        }));
        
        try {
          const response = await fetch('/api/schedule/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              article_id: articleId,
              platform: options.platform,
              scheduled_time: options.time
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed with status ${response.status}`);
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to schedule article ${articleId}:`, error);
          // Get article title for better error display
          const article = stories.find(s => s.id === articleId);
          failedArticles.push({ 
            id: articleId, 
            title: article?.title,
            error: error.message 
          });
        }
      }

      // Show completion feedback (Requirements 5.4, 5.5, 10.3, 10.4, 10.5)
      if (failedArticles.length === 0) {
        // Show success toast and clear selection on completion (Requirement 5.4)
        toast.success(`Successfully scheduled ${successCount} article${successCount > 1 ? 's' : ''} for ${options.platform}!`);
        clearSelection();
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Scheduled ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Show error component with details of failed articles (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Scheduling',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkSchedule(options, failedArticles.map(a => a.id));
          }
        });
      } else {
        // All articles failed - show error component (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Scheduling',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkSchedule(options, failedArticles.map(a => a.id));
          }
        });
      }

    } catch (error) {
      console.error('Bulk schedule error:', error);
      toast.error(`Bulk scheduling failed: ${error.message}`);
    } finally {
      // Hide loading overlay (Requirement 10.1)
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  const handleBulkTag = async (tags, articleIdsOverride = null) => {
    const articleIds = articleIdsOverride || Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    if (!tags || tags.length === 0) {
      toast.error('Please provide at least one tag');
      return;
    }

    // Track progress
    let successCount = 0;
    let failedArticles = [];
    const totalCount = articleIds.length;

    // Show loading overlay with progress (Requirements 10.1, 10.2)
    setBulkOperationState({
      isActive: true,
      operationName: 'Adding Tags',
      current: 0,
      total: totalCount
    });

    try {
      // Call /api/tags/{article_id} endpoint for each article (Requirement 6.3)
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        
        // Update progress (Requirement 10.2)
        setBulkOperationState(prev => ({
          ...prev,
          current: i + 1
        }));
        
        try {
          // First, fetch existing tags for this article (Requirement 6.4)
          const getResponse = await fetch(`/api/tags/${articleId}`);
          let existingTags = [];
          
          if (getResponse.ok) {
            const getData = await getResponse.json();
            existingTags = Array.isArray(getData.tags) ? getData.tags : [];
          }

          // Append new tags to existing tags without removing them (Requirement 6.4)
          const mergedTags = [...new Set([...existingTags, ...tags])]; // Use Set to avoid duplicates

          // POST the merged tags
          const postResponse = await fetch(`/api/tags/${articleId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: mergedTags })
          });

          if (!postResponse.ok) {
            const errorData = await postResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed with status ${postResponse.status}`);
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to tag article ${articleId}:`, error);
          // Get article title for better error display
          const article = stories.find(s => s.id === articleId);
          failedArticles.push({ 
            id: articleId, 
            title: article?.title,
            error: error.message 
          });
        }
      }

      // Refresh article data after completion (Requirement 6.5)
      await fetchStories();

      // Show completion feedback (Requirement 6.5, 10.3, 10.4, 10.5)
      if (failedArticles.length === 0) {
        toast.success(`Successfully added tags to ${successCount} article${successCount > 1 ? 's' : ''}!`);
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Tagged ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Show error component with details of failed articles (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Tagging',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkTag(tags, failedArticles.map(a => a.id));
          }
        });
      } else {
        // All articles failed - show error component (Requirements 10.3, 10.4, 10.5)
        setBulkOperationError({
          isVisible: true,
          operationName: 'Tagging',
          failedArticles: failedArticles,
          retryHandler: () => {
            setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
            handleBulkTag(tags, failedArticles.map(a => a.id));
          }
        });
      }

    } catch (error) {
      console.error('Bulk tag error:', error);
      toast.error(`Bulk tagging failed: ${error.message}`);
    } finally {
      // Hide loading overlay (Requirement 10.1)
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  const handleBulkExport = async () => {
    const articleIds = Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    // Show loading overlay (Requirements 10.1, 10.2)
    setBulkOperationState({
      isActive: true,
      operationName: 'Exporting Articles',
      current: 1,
      total: 1
    });

    try {
      // Call /api/export/batch endpoint with array of selected article IDs (Requirement 7.1)
      const response = await fetch('/api/export/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: articleIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Export failed with status ${response.status}`);
      }

      // Receive Markdown file blob from response (Requirement 7.2)
      const blob = await response.blob();
      
      // Create blob URL and trigger download (Task 7.2)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Format filename with timestamp and count (Task 7.2)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      a.download = `articles-export-${articleIds.length}-${timestamp}.md`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Show success toast (Task 7.2)
      toast.success(`Successfully exported ${articleIds.length} article${articleIds.length > 1 ? 's' : ''}!`);

    } catch (error) {
      console.error('Bulk export error:', error);
      // Show error toast if export fails (Task 7.2, Requirements 10.3, 10.4, 10.5)
      const failedArticles = articleIds.map(id => {
        const article = stories.find(s => s.id === id);
        return { id, title: article?.title, error: error.message };
      });
      setBulkOperationError({
        isVisible: true,
        operationName: 'Export',
        failedArticles: failedArticles,
        retryHandler: null // Export doesn't support retry
      });
    } finally {
      // Hide loading overlay (Requirement 10.1)
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  const handleBulkMarkPosted = async (articleIdsOverride = null) => {
    const articleIds = articleIdsOverride || Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    const platforms = [
      'twitter', 'threads', 'linkedin', 'reddit',
      'facebook', 'instagram', 'medium',
      'telegram', 'discord'
    ];

    setBulkOperationState({
      isActive: true,
      operationName: 'Marking as Posted',
      current: 0,
      total: articleIds.length
    });

    const results = {
      succeeded: [],
      failed: [],
    };

    try {
      for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        
        setBulkOperationState(prev => ({
          ...prev,
          current: i + 1
        }));
        
        for (const platform of platforms) {
          try {
            const checkResponse = await fetch(`/api/content/${articleId}/${platform}`);
            if (!checkResponse.ok) continue;

            const contentData = await checkResponse.json();
            
            if (contentData.content && !contentData.posted) {
              const res = await fetch('/api/content/posted', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  article_id: articleId,
                  platform: platform,
                  posted: true
                })
              });
              
              if (res.ok) {
                results.succeeded.push(`${articleId}/${platform}`);
              } else {
                const errorData = await res.json().catch(() => ({}));
                results.failed.push({
                  article_id: articleId,
                  platform,
                  error: errorData.error || `HTTP ${res.status}`
                });
              }
            }
          } catch(e) {
            results.failed.push({
              article_id: articleId,
              platform,
              error: e.message
            });
          }
        }
      }

      await fetchStories();

      // Show accurate results
      if (results.failed.length === 0 && results.succeeded.length > 0) {
          toast.success(`✓ All ${results.succeeded.length} articles marked as posted`);
      } else if (results.succeeded.length === 0 && results.failed.length > 0) {
          toast.error(
              `✗ Failed to mark ${results.failed.length} articles. See details below.`
          );
      } else if (results.succeeded.length > 0 && results.failed.length > 0) {
          toast.warning(
              `⚠ ${results.succeeded.length} succeeded, ${results.failed.length} failed. See details.`
          );
      } else if (results.succeeded.length === 0 && results.failed.length === 0) {
          toast.info('No generated content found to mark as posted for the selected articles.');
      }
      
      // Show details in expandable section
      if (results.failed.length > 0) {
          const failedArticlesForState = results.failed.map(f => {
            const article = stories.find(s => s.id === f.article_id);
            return {
              id: f.article_id,
              title: article?.title,
              error: `Platform ${f.platform}: ${f.error}`
            };
          });
          
          setBulkOperationError({
            isVisible: true,
            operationName: 'Mark as Posted',
            failedArticles: failedArticlesForState,
            retryHandler: () => {
              setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null });
              const uniqueFailedIds = [...new Set(results.failed.map(f => f.article_id))];
              handleBulkMarkPosted(uniqueFailedIds);
            }
          });
      }

    } catch (error) {
      console.error('Bulk mark posted error:', error);
      toast.error(`Bulk mark posted failed: ${error.message}`);
    } finally {
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  const handleBulkDelete = async () => {
    const articleIds = Array.from(selectedIds);
    if (articleIds.length === 0) {
      toast.error('No articles selected');
      return;
    }

    // Close the confirmation modal
    setShowDeleteConfirmModal(false);

    // Show loading overlay (Requirements 10.1, 10.2)
    setBulkOperationState({
      isActive: true,
      operationName: 'Deleting Articles',
      current: 1,
      total: 1
    });

    try {
      // Call /api/articles/bulk-delete endpoint with array of article IDs (Requirement 9.3)
      const response = await fetch('/api/articles/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article_ids: articleIds })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Delete failed with status ${response.status}`);
      }

      // Refresh stories after deletion via React Query cache invalidation
      queryClient.invalidateQueries(['stories']);

      // Clear selection after successful deletion (Requirement 9.4)
      clearSelection();

      // Show success toast with count of deleted articles (Requirement 9.4)
      toast.success(`Successfully deleted ${articleIds.length} article${articleIds.length > 1 ? 's' : ''}!`);

    } catch (error) {
      console.error('Bulk delete error:', error);
      // Show error component if deletion fails (Requirement 9.5, 10.3, 10.4, 10.5)
      const failedArticles = articleIds.map(id => {
        const article = stories.find(s => s.id === id);
        return { id, title: article?.title, error: error.message };
      });
      setBulkOperationError({
        isVisible: true,
        operationName: 'Delete',
        failedArticles: failedArticles,
        retryHandler: null // Delete doesn't support retry for safety
      });
    } finally {
      // Hide loading overlay (Requirement 10.1)
      setBulkOperationState({
        isActive: false,
        operationName: '',
        current: 0,
        total: 0
      });
    }
  };

  // Keyboard shortcuts for bulk operations (Requirements 12.1, 12.2, 12.3)
  // IMPORTANT: This useEffect must come AFTER all helper functions it references
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only respond to shortcuts when dashboard view is active (Requirement 12.4)
      if (currentView !== 'dashboard') return;
      
      // Disable shortcuts when any modal is open (Requirement 12.5)
      if (scheduleOpen || showDeleteConfirmModal || showTagModal || showScheduleModal) return;
      
      // Ctrl+A (Cmd+A on Mac) - Select all visible articles (Requirement 12.1)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault(); // Prevent default browser behavior
        if (filteredStories.length > 0) {
          handleSelectAllFiltered();
        }
        return;
      }
      
      // Escape - Clear selection (Requirement 12.2)
      if (event.key === 'Escape' && selectedIds.size > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }
      
      // Delete - Trigger bulk delete confirmation (Requirement 12.3)
      if (event.key === 'Delete' && selectedIds.size > 0) {
        event.preventDefault();
        setShowDeleteConfirmModal(true);
        return;
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentView, scheduleOpen, showDeleteConfirmModal, showTagModal, showScheduleModal, selectedIds.size, clearSelection, filteredStories.length, handleSelectAllFiltered]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden">
      <SkipLink targetId="main-content" />
      <Sidebar
        activeSource={activeSource}
        setActiveSource={setActiveSource}
        onSourceSelect={handleSourceSelect}
        sources={uniqueSources}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeTheme={activeTheme}
      />

      <div className="flex-1 ml-64 flex flex-col min-w-0 min-h-screen">
        {/* Simplified Global Header */}
        <header className={`backdrop-blur-md border-b sticky top-0 z-10 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-900/80 border-white/10' : 'bg-white/80 border-gray-200'}`}>
          <div className="flex items-center gap-4 lg:gap-6 flex-1">
            <button className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-indigo-600 transition-colors" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative w-48 lg:w-64 group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none font-bold"
              />
            </div>

            <QuickActions
              onFetchData={handleRunPipeline}
              onGenerateContent={() => {
                if (selectedIds.size > 0) {
                  handleBulkGenerate();
                } else {
                  toast.info('Please select articles to generate content for.');
                }
              }}
              onSchedule={() => setScheduleOpen(true)}
              onExport={handleExport}
              pipelineRunning={pipelineRunning}
              processedCount={stories.filter(s => s.summary).length}
              variant="compact"
            />
          </div>

          <div className="flex items-center gap-4 ml-8">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${pipelineRunning ? 'bg-orange-50 border-orange-100' : 'bg-indigo-50 border-indigo-100'}`}>
              <Zap className={`w-3.5 h-3.5 ${pipelineRunning ? 'text-orange-600 animate-pulse' : 'text-indigo-600'}`} />
              <span className={`text-[9px] font-black uppercase tracking-wider flex items-center ${pipelineRunning ? 'text-orange-700' : 'text-indigo-700'}`}>
                {pipelineRunning ? `Syncing... (${pipelineElapsed}s / 300s)` : 'Ready'}
              </span>
              {pipelineRunning && (
                <progress className="w-16 h-1.5 ml-2 accent-orange-500 rounded-full bg-orange-200" value={pipelineElapsed} max={300}></progress>
              )}
            </div>

            <button
              onClick={fetchStories}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50"
              title="Refresh Global Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className={`flex-1 p-8 transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* View Rendering — URL-based routing with lazy-loaded views */}
            <Suspense fallback={<Skeleton type="page" />}>
              <Routes>
              <Route path="/analytics" element={<AnalyticsView onBack={() => setCurrentView('dashboard')} />} />
              {/* Alias: /metrics redirects to same AnalyticsView as /analytics */}
              <Route path="/metrics" element={<AnalyticsView onBack={() => setCurrentView('dashboard')} />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/media" element={<MediaView />} />
              <Route path="/podcast" element={<PodcastView />} />
              <Route path="/research" element={<ResearchView />} />
              <Route path="/settings" element={<SettingsView activeTheme={activeTheme} initialTab="monetization" />} />
              <Route path="/monetization" element={<SettingsView activeTheme={activeTheme} initialTab="monetization" />} />
              <Route path="/monetize" element={<SettingsView activeTheme={activeTheme} initialTab="monetization" />} />
              <Route path="/health" element={<SettingsView activeTheme={activeTheme} initialTab="health" />} />
              <Route path="/webhooks" element={<SettingsView activeTheme={activeTheme} initialTab="webhooks" />} />
              <Route path="/rss" element={<SettingsView activeTheme={activeTheme} initialTab="rss" />} />
              <Route path="/style" element={<SettingsView activeTheme={activeTheme} initialTab="style" />} />
              <Route path="/extension" element={<SettingsView activeTheme={activeTheme} initialTab="extension" />} />
              {/* Dev-only routes — only render in development mode */}
              <Route path="/dev" element={<DevToolsView />} />
              <Route path="/dev/theme" element={<ThemeExample />} />
              <Route path="/dev/tokens" element={<TokenReference />} />
              <Route path="/" element={
                <DashboardView
                  stories={stories}
                  loading={loading}
                  filteredStories={filteredStories}
                  uniqueSources={uniqueSources}
                  selectedPlatforms={selectedPlatforms}
                  activeTheme={activeTheme}
                  activeSource={activeSource}
                  fetchNextPage={fetchNextPage}
                  hasNextPage={hasNextPage}
                  isFetchingNextPage={isFetchingNextPage}
                  filters={filters}
                  setFilters={setFilters}
                  selectedIds={selectedIds}
                  toggleSelection={toggleSelection}
                  handleSelectAllFiltered={handleSelectAllFiltered}
                  getSelectAllState={getSelectAllState}
                  clearSelection={clearSelection}
                  bulkOperationState={bulkOperationState}
                  setBulkOperationState={setBulkOperationState}
                  bulkOperationError={bulkOperationError}
                  setBulkOperationError={setBulkOperationError}
                  showTagModal={showTagModal}
                  setShowTagModal={setShowTagModal}
                  showScheduleModal={showScheduleModal}
                  setShowScheduleModal={setShowScheduleModal}
                  showDeleteConfirmModal={showDeleteConfirmModal}
                  setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                  handleBulkGenerate={handleBulkGenerate}
                  handleBulkSchedule={handleBulkSchedule}
                  handleBulkTag={handleBulkTag}
                  handleBulkExport={handleBulkExport}
                  handleBulkMarkPosted={handleBulkMarkPosted}
                  handleBulkDelete={handleBulkDelete}
                  handleRunPipeline={handleRunPipeline}
                  handleSourceSelect={handleSourceSelect}
                />
              } />
              <Route path="*" element={<NotFoundView />} />
            </Routes>
            </Suspense>
          </div>
        </main>

        <footer className="mt-auto py-8 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Zap className="w-3 h-3" /> Powered by AI Pulse Pro Engine v2.0
            </p>
          </div>
        </footer>
      </div>

      {/* Schedule Modal */}
      {scheduleOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-200 animate-slide-up">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Automation Engine</h2>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">
                  {scheduleNextRun ? `Next run: ${new Date(scheduleNextRun).toLocaleTimeString()}` : 'System Idle'}
                </p>
              </div>
              <button onClick={() => setScheduleOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-12 h-7 rounded-full relative transition-colors ${scheduleEnabled ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${scheduleEnabled ? 'left-6' : 'left-1'}`} />
                </div>
                <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-slate-700">Enable Automated Syncing</span>
              </label>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Days</label>
                <div className="grid grid-cols-7 gap-2">
                  {dayOptions.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all border ${scheduleDays.includes(d.key) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Execution Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-slate-100">
              <button onClick={() => setScheduleOpen(false)} className="px-6 py-3 text-sm font-bold text-slate-500">Close</button>
              <button
                onClick={saveSchedule}
                disabled={scheduleLoading}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all transform active:scale-95"
              >
                {scheduleLoading ? 'Calibrating...' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (triggered by keyboard shortcut or BulkActionsBar) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-200 animate-slide-up">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Delete {selectedIds.size} {selectedIds.size === 1 ? 'Article' : 'Articles'}?</h2>
              </div>
              <button onClick={() => setShowDeleteConfirmModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8">
              <p className="text-sm text-slate-600">
                This action is irreversible. All selected articles and their generated content will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-8 py-6 border-t border-slate-100">
              <button 
                onClick={() => setShowDeleteConfirmModal(false)} 
                className="px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-8 py-3 bg-red-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-red-500/20 hover:bg-red-700 transition-all transform active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'Article' : 'Articles'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Defined at module scope — NOT inside App() — so React sees a stable
// component type across renders and never unmounts/remounts it.
const ToastWrapper = () => {
  const { toasts, removeToast } = useToastContext();
  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
};

export default function App() {
  return (
    <ToastProvider>
      <AudioProvider>
        <AppContent />
        <ToastWrapper />
      </AudioProvider>
    </ToastProvider>
  );
}
