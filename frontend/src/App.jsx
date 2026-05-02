import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import SkipLink from './components/SkipLink';
import ToastContainer from './components/ToastContainer';
import QuickActions from './components/QuickActions';
import Skeleton from './components/Skeleton';
import { ToastProvider, useToastContext } from './hooks/useToast';
import { AudioProvider } from './context/AudioContext';
import { useBulkSelection } from './hooks/useBulkSelection';
import { useStories, useSources } from './hooks/useStories';
import { usePipeline } from './hooks/usePipeline';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from './store/appStore';
import NotificationPanel from './components/NotificationPanel';
import { apiFetch } from './api/client';
import { usePipelineRun } from './hooks/usePipelineRun';
import { useScheduleModal } from './hooks/useScheduleModal';
import { useAppKeyboardShortcuts } from './hooks/useAppKeyboardShortcuts';
import { BulkOperationsProvider } from './context/BulkOperationsContext';
import { StoriesProvider } from './context/StoriesContext';
import BulkConfirmationDialog from './components/BulkConfirmationDialog';
import BulkScheduleModal from './components/BulkScheduleModal';
// View components — lazy loaded per route to reduce initial bundle size
const AnalyticsView = lazy(() => import('./views/AnalyticsView'));
const CalendarView = lazy(() => import('./views/CalendarView'));
const MediaView = lazy(() => import('./views/MediaView'));
const PodcastView = lazy(() => import('./views/PodcastView'));
const ResearchView = lazy(() => import('./views/ResearchView'));
const ArticlesView = lazy(() => import('./views/ArticlesView'));
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
  Search,
  Calendar,
  Download,
  Bell,
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
  const [showPlatformScheduleModal, setShowPlatformScheduleModal] = useState(false);
  const [platformScheduleData, setPlatformScheduleData] = useState(null);
  
  // Bulk confirmation dialog state (Requirements 1.1, 1.5)
  const [bulkConfirmation, setBulkConfirmation] = useState({
    isOpen: false,
    operationName: '',
    itemCount: 0,
    onConfirm: null,
  });

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
  
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  
  // Pipeline run hook (T9 refactoring)
  const {
    pipelineRunning,
    pipelineElapsed,
    handleRunPipeline: runPipeline,
  } = usePipelineRun({
    onSuccess: (msg) => toast.success(msg),
    onError: (msg) => toast.error(msg),
    onPartialSuccess: (msg) => toast.success(msg),
  });
  
  // Schedule modal hook (T9 refactoring)
  const {
    scheduleOpen,
    setScheduleOpen,
    scheduleLoading,
    scheduleEnabled,
    setScheduleEnabled,
    scheduleTime,
    setScheduleTime,
    scheduleDays,
    scheduleNextRun,
    scheduleServerTime,
    scheduleError,
    openSchedule,
    saveSchedule,
    toggleDay,
  } = useScheduleModal({
    onSuccess: (msg) => toast.success(msg),
    onError: (msg) => toast.error(msg),
  });
  
  // Handle schedule modal trigger from StoryCard
  useEffect(() => {
    const handleOpenSchedule = (e) => {
      const { articleId, platform, platforms, mode } = e.detail || {};
      
      // Handle per-platform scheduling (from StoryCard Review section)
      if (platform || platforms || mode === 'schedule-all') {
        setPlatformScheduleData(e.detail);
        setShowPlatformScheduleModal(true);
        return;
      }
      
      // Handle article-level scheduling (from primary action button)
      // Pre-select the article and open schedule modal
      if (articleId && !selectedIds.has(articleId)) {
        toggleSelection(articleId);
      }
      setShowScheduleModal(true);
    };
    window.addEventListener('open-schedule-modal', handleOpenSchedule);
    return () => window.removeEventListener('open-schedule-modal', handleOpenSchedule);
  }, [selectedIds, toggleSelection]);

  // Handle source changes from sidebar
  const handleSourceSelect = (source) => {
    setActiveSource(source);
    setFilters(prev => ({ ...prev, source: source }));
    if (source) {
      navigate('/articles');
    }
  };
  
  // Bulk operation state — from Zustand store
  const bulkOperationState = useAppStore((s) => s.bulkOperationState);
  const setBulkOperationState = useAppStore((s) => s.setBulkOperationState);
  const bulkOperationError = useAppStore((s) => s.bulkOperationError);
  const setBulkOperationError = useAppStore((s) => s.setBulkOperationError);
  
  // Notification system — from Zustand store
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const addNotification = useAppStore((s) => s.addNotification);
  const [notificationOpen, setNotificationOpen] = useState(false);

  // Add welcome notification on first load (for testing)
  useEffect(() => {
    const hasShownWelcome = sessionStorage.getItem('welcome-notification-shown');
    if (!hasShownWelcome) {
      addNotification({
        type: 'info',
        title: 'Welcome to AI Pulse Pro',
        message: 'Notification system is active. You\'ll receive updates for pipeline runs, content generation, and more.',
        timestamp: new Date().toISOString(),
      });
      sessionStorage.setItem('welcome-notification-shown', 'true');
    }
  }, [addNotification]);

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
  
  // Wrap runPipeline to match existing function name
  const handleRunPipeline = runPipeline;

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
        if (import.meta.env.DEV) {
          console.log(`Deep dive into: ${title}`);
        }
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

  // Automatic cache invalidation when pipeline finishes
  useEffect(() => {
    if (pipelineStatus.stage === 'done') {
      if (import.meta.env.DEV) {
        console.log('Pipeline finished. Invalidating stories cache...');
      }
      queryClient.invalidateQueries(['stories']);
      
      // Add notification for pipeline completion
      addNotification({
        type: 'success',
        title: 'Pipeline Completed',
        message: 'Successfully fetched and analyzed new articles',
        timestamp: new Date().toISOString(),
      });
    }
  }, [pipelineStatus.stage, queryClient, addNotification]);

  // Clear selection when navigating away from articles/dashboard
  useEffect(() => {
    if (currentView !== 'dashboard' && currentView !== 'articles' && selectedIds.size > 0) {
      clearSelection();
    }
  }, [currentView]);

  const handleExport = async () => {
    try {
      const res = await apiFetch('/export');
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

  const readyCount = React.useMemo(
    () => stories.filter((story) => story.posts && story.posts.length > 0 && !story.posted).length,
    [stories]
  );

  const searchableViews = new Set(['articles', 'research']);
  const shellMeta = {
    dashboard: {
      eyebrow: 'Front Page',
      title: 'Command Center',
      subtitle: readyCount > 0
        ? `${readyCount} launch-ready stor${readyCount === 1 ? 'y' : 'ies'} waiting for review`
        : 'Monitor intake, quality, and publishing readiness from one place.',
    },
    articles: {
      eyebrow: 'Production',
      title: activeSource ? `${activeSource} Feed` : 'Article Pipeline',
      subtitle: `${filteredStories.length} stor${filteredStories.length === 1 ? 'y' : 'ies'} in the current view`,
    },
    analytics: {
      eyebrow: 'Performance',
      title: 'Metrics Engine',
      subtitle: 'Track publishing quality, output velocity, and pipeline performance.',
    },
    calendar: {
      eyebrow: 'Planning',
      title: 'Editorial Calendar',
      subtitle: 'Manage timing, scheduling, and editorial sequencing.',
    },
    media: {
      eyebrow: 'Assets',
      title: 'Media Library',
      subtitle: 'Review generated media and reusable creative assets.',
    },
    research: {
      eyebrow: 'Discovery',
      title: 'Research Hub',
      subtitle: 'Search and validate the upstream intelligence feeding the pipeline.',
    },
    podcast: {
      eyebrow: 'Audio',
      title: 'Podcast Studio',
      subtitle: 'Shape audio output and monitor synthesis-ready material.',
    },
    settings: {
      eyebrow: 'System',
      title: 'Strategy Lab',
      subtitle: 'Configure providers, workflows, and publishing defaults.',
    },
  };
  const activeShellMeta = shellMeta[currentView] || {
    eyebrow: 'Pulse Pro',
    title: currentView.charAt(0).toUpperCase() + currentView.slice(1),
    subtitle: 'Contextual workspace controls for the current route.',
  };
  const showShellSearch = searchableViews.has(currentView);

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

    // Show confirmation dialog for >10 items (Requirements 1.1, 1.5)
    if (articleIds.length > 10) {
      setBulkConfirmation({
        isOpen: true,
        operationName: 'Generate Content',
        itemCount: articleIds.length,
        onConfirm: () => {
          setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null });
          executeBulkGenerate(articleIds);
        },
      });
      return;
    }

    // For ≤10 items, proceed directly
    await executeBulkGenerate(articleIds);
  };

  const executeBulkGenerate = async (articleIds) => {

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
      // T13: Process articles with concurrency limit (2 at a time) to avoid rate limits
      const CONCURRENCY_LIMIT = 2;
      const queue = [...articleIds];
      const inProgress = new Set();
      
      const processArticle = async (articleId) => {
        try {
          // Call /api/generate endpoint for each article (Requirement 4.1)
          const response = await apiFetch('/generate', {
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
          if (import.meta.env.DEV) {
            console.error(`Failed to generate content for article ${articleId}:`, error);
          }
          // Get article title for better error display
          const article = stories.find(s => s.id === articleId);
          failedArticles.push({ 
            id: articleId, 
            title: article?.title,
            error: error.message 
          });
        } finally {
          // Update progress
          setBulkOperationState(prev => ({
            ...prev,
            current: totalCount - queue.length - inProgress.size + 1
          }));
        }
      };

      // Process queue with concurrency limit
      while (queue.length > 0 || inProgress.size > 0) {
        // Start new tasks up to concurrency limit
        while (inProgress.size < CONCURRENCY_LIMIT && queue.length > 0) {
          const articleId = queue.shift();
          const promise = processArticle(articleId).finally(() => {
            inProgress.delete(promise);
          });
          inProgress.add(promise);
        }
        
        // Wait for at least one task to complete
        if (inProgress.size > 0) {
          await Promise.race(inProgress);
        }
      }

      // Refresh article data after completion (Requirement 4.3)
      await fetchStories();

      // Show completion feedback (Requirements 4.3, 4.4, 10.3, 10.4, 10.5)
      if (failedArticles.length === 0) {
        toast.success(`Successfully generated content for ${successCount} article${successCount > 1 ? 's' : ''}!`);
        // Add notification for successful content generation
        addNotification({
          type: 'success',
          title: 'Content Generated',
          message: `Successfully generated content for ${successCount} article${successCount > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
        });
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Generated ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Add notification for partial success
        addNotification({
          type: 'warning',
          title: 'Content Generation Partial Success',
          message: `Generated ${successCount} article${successCount > 1 ? 's' : ''}, but ${failedArticles.length} failed`,
          timestamp: new Date().toISOString(),
        });
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
        // Add notification for complete failure
        addNotification({
          type: 'error',
          title: 'Content Generation Failed',
          message: `Failed to generate content for ${failedArticles.length} article${failedArticles.length > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
        });
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

    // Show confirmation dialog for >10 items (Requirements 1.1, 1.5)
    if (articleIds.length > 10) {
      setBulkConfirmation({
        isOpen: true,
        operationName: 'Schedule Content',
        itemCount: articleIds.length,
        onConfirm: () => {
          setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null });
          executeBulkSchedule(options, articleIds);
        },
      });
      return;
    }

    // For ≤10 items, proceed directly
    await executeBulkSchedule(options, articleIds);
  };

  const executeBulkSchedule = async (options, articleIds) => {

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
          const response = await apiFetch('/schedule/queue', {
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
        // Add notification for successful scheduling
        addNotification({
          type: 'success',
          title: 'Articles Scheduled',
          message: `Successfully scheduled ${successCount} article${successCount > 1 ? 's' : ''} for ${options.platform}`,
          timestamp: new Date().toISOString(),
        });
        clearSelection();
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Scheduled ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Add notification for partial success
        addNotification({
          type: 'warning',
          title: 'Scheduling Partial Success',
          message: `Scheduled ${successCount} article${successCount > 1 ? 's' : ''}, but ${failedArticles.length} failed`,
          timestamp: new Date().toISOString(),
        });
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
        // Add notification for complete failure
        addNotification({
          type: 'error',
          title: 'Scheduling Failed',
          message: `Failed to schedule ${failedArticles.length} article${failedArticles.length > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
        });
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

  // Handle per-platform scheduling from StoryCard
  const handlePlatformSchedule = async (options) => {
    if (!platformScheduleData) return;
    
    const { articleId, platform, platforms, mode } = platformScheduleData;
    
    // Validate inputs
    if (!options.time) {
      toast.error('Please select a date and time');
      return;
    }
    
    try {
      if (mode === 'schedule-all' && platforms && platforms.length > 0) {
        // Schedule all platforms
        let successCount = 0;
        for (const plat of platforms) {
          try {
            const response = await apiFetch('/schedule/queue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                article_id: articleId,
                platform: plat,
                scheduled_time: options.time
              })
            });
            
            if (response.ok) {
              successCount++;
            }
          } catch (error) {
            console.error(`Failed to schedule ${plat}:`, error);
          }
        }
        
        if (successCount > 0) {
          toast.success(`Scheduled ${successCount} platform${successCount > 1 ? 's' : ''} successfully!`);
        } else {
          toast.error('Failed to schedule platforms');
        }
      } else if (platform) {
        // Schedule single platform
        const response = await apiFetch('/schedule/queue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: articleId,
            platform: platform,
            scheduled_time: options.time
          })
        });
        
        if (response.ok) {
          toast.success(`Scheduled for ${platform} successfully!`);
        } else {
          const errorData = await response.json().catch(() => ({}));
          toast.error(errorData.error || 'Failed to schedule');
        }
      }
      
      // Close modal and clear data
      setShowPlatformScheduleModal(false);
      setPlatformScheduleData(null);
      
      // Refresh stories to show updated schedule status
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    } catch (error) {
      console.error('Platform schedule error:', error);
      toast.error(`Scheduling failed: ${error.message}`);
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
          const getResponse = await apiFetch(`/tags/${articleId}`);
          let existingTags = [];
          
          if (getResponse.ok) {
            const getData = await getResponse.json();
            existingTags = Array.isArray(getData.tags) ? getData.tags : [];
          }

          // Append new tags to existing tags without removing them (Requirement 6.4)
          const mergedTags = [...new Set([...existingTags, ...tags])]; // Use Set to avoid duplicates

          // POST the merged tags
          const postResponse = await apiFetch(`/tags/${articleId}`, {
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
        // Add notification for successful tagging
        addNotification({
          type: 'success',
          title: 'Tags Added',
          message: `Successfully added tags to ${successCount} article${successCount > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
        });
      } else if (successCount > 0) {
        // Show success toast for successful articles
        toast.success(`Tagged ${successCount} article${successCount > 1 ? 's' : ''} successfully`);
        // Add notification for partial success
        addNotification({
          type: 'warning',
          title: 'Tagging Partial Success',
          message: `Tagged ${successCount} article${successCount > 1 ? 's' : ''}, but ${failedArticles.length} failed`,
          timestamp: new Date().toISOString(),
        });
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
        // Add notification for complete failure
        addNotification({
          type: 'error',
          title: 'Tagging Failed',
          message: `Failed to add tags to ${failedArticles.length} article${failedArticles.length > 1 ? 's' : ''}`,
          timestamp: new Date().toISOString(),
        });
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
      const response = await apiFetch('/export/batch', {
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
      
      // Add notification for successful export
      addNotification({
        type: 'success',
        title: 'Articles Exported',
        message: `Successfully exported ${articleIds.length} article${articleIds.length > 1 ? 's' : ''} to Markdown`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Bulk export error:', error);
      // Add notification for export failure
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: `Failed to export ${articleIds.length} article${articleIds.length > 1 ? 's' : ''}: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
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
            const checkResponse = await apiFetch(`/content/${articleId}/${platform}`);
            if (!checkResponse.ok) continue;

            const contentData = await checkResponse.json();
            
            if (contentData.content && !contentData.posted) {
              const res = await apiFetch('/content/posted', {
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

    // Show confirmation dialog for >10 items (Requirements 1.1, 1.5)
    if (articleIds.length > 10) {
      setBulkConfirmation({
        isOpen: true,
        operationName: 'Delete Articles',
        itemCount: articleIds.length,
        onConfirm: () => {
          setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null });
          executeBulkDelete(articleIds);
        },
      });
      return;
    }

    // For ≤10 items, show the existing delete confirmation modal
    setShowDeleteConfirmModal(true);
  };

  const executeBulkDelete = async (articleIds) => {

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
      const response = await apiFetch('/articles/bulk-delete', {
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
      
      // Add notification for successful deletion
      addNotification({
        type: 'success',
        title: 'Articles Deleted',
        message: `Successfully deleted ${articleIds.length} article${articleIds.length > 1 ? 's' : ''}`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Bulk delete error:', error);
      // Add notification for deletion failure
      addNotification({
        type: 'error',
        title: 'Deletion Failed',
        message: `Failed to delete ${articleIds.length} article${articleIds.length > 1 ? 's' : ''}: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
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

  // Keyboard shortcuts for bulk operations (T9 refactoring)
  useAppKeyboardShortcuts({
    currentView,
    scheduleOpen,
    showDeleteConfirmModal,
    showTagModal,
    showScheduleModal,
    selectedIds,
    clearSelection,
    filteredStoriesLength: filteredStories.length,
    handleSelectAllFiltered,
    setShowDeleteConfirmModal,
  });

  // Context values for reducing prop drilling (T10 refactoring)
  const bulkOperationsValue = {
    selectedIds,
    toggleSelection,
    handleSelectAllFiltered,
    getSelectAllState,
    clearSelection,
    bulkOperationState,
    setBulkOperationState,
    bulkOperationError,
    setBulkOperationError,
    showTagModal,
    setShowTagModal,
    showScheduleModal,
    setShowScheduleModal,
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    handleBulkGenerate,
    handleBulkSchedule,
    handleBulkTag,
    handleBulkExport,
    handleBulkMarkPosted,
    handleBulkDelete,
  };

  const storiesValue = {
    stories,
    loading,
    filteredStories,
    uniqueSources,
    activeSource,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    filters,
    setFilters,
    handleSourceSelect,
  };

  return (
    <div className="flex min-h-screen overflow-x-hidden" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
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

      <div className="app-shell-content flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header — Pulse Pro style */}
        <header
          className="sticky top-0 z-20 flex items-center gap-3 flex-shrink-0 flex-wrap"
          style={{
            minHeight: 'var(--header-h)',
            background: 'rgba(13, 17, 32, 0.92)',
            borderBottom: '1px solid var(--border)',
            padding: '10px 20px',
            backdropFilter: 'blur(14px)',
          }}
        >
          {/* Mobile menu toggle */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              className="lg:hidden flex-shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              style={{
                color: 'var(--text2)',
                width: 34,
                height: 34,
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
              aria-label="Open navigation"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="min-w-0">
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>
                {activeShellMeta.eyebrow}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                  {activeShellMeta.title}
                </div>
                {currentView === 'dashboard' && readyCount > 0 && (
                  <button
                    onClick={() => navigate('/articles')}
                    className="hidden md:inline-flex items-center gap-1.5 flex-shrink-0"
                    style={{
                      background: 'var(--accent-glow)',
                      border: '1px solid var(--accent)',
                      borderRadius: 999,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--accent)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Zap style={{ width: 12, height: 12 }} />
                    {readyCount} ready to launch
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {activeShellMeta.subtitle}
              </div>
            </div>
          </div>

          {/* Search */}
          {showShellSearch && (
          <div
            className="shell-header-search flex items-center gap-2 flex-shrink-0"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '8px 12px',
              transition: 'all 0.2s',
            }}
            onFocusCapture={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg3)'; }}
            onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
          >
            <Search style={{ width: 14, height: 14, color: 'var(--text3)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search articles, research…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'var(--text)', fontSize: 12,
                fontFamily: 'var(--font-body)', width: '100%',
              }}
            />
          </div>
          )}

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <div
              className="hidden md:flex items-center gap-1.5 flex-shrink-0"
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                background: pipelineRunning ? 'var(--amber-dim)' : 'var(--green-dim)',
                border: `1px solid ${pipelineRunning ? 'var(--amber)' : 'var(--green)'}`,
                color: pipelineRunning ? 'var(--amber)' : 'var(--green)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: pipelineRunning ? 'var(--amber)' : 'var(--green)',
                  boxShadow: `0 0 6px ${pipelineRunning ? 'var(--amber)' : 'var(--green)'}`,
                  flexShrink: 0,
                  display: 'inline-block',
                }}
                className={pipelineRunning ? '' : 'animate-pulse-dot'}
              />
              {pipelineRunning ? `Syncing ${pipelineElapsed}s` : 'Pipeline ready'}
            </div>

            <button
              onClick={handleRunPipeline}
              disabled={pipelineRunning}
              className="flex items-center gap-1.5 flex-shrink-0"
              style={{
                background: pipelineRunning ? 'var(--amber-dim)' : 'var(--teal-dim)',
                border: `1px solid ${pipelineRunning ? 'var(--amber)' : 'var(--teal)'}`,
                borderRadius: 10,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: pipelineRunning ? 'var(--amber)' : 'var(--teal)',
                cursor: pipelineRunning ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                opacity: pipelineRunning ? 0.8 : 1,
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} className={pipelineRunning ? 'animate-spin' : ''} />
              <span>{pipelineRunning ? 'Syncing' : 'Run pipeline'}</span>
            </button>

            <button
              onClick={() => navigate('/calendar')}
              title="Calendar"
              className="hidden sm:flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
            >
              <Calendar style={{ width: 16, height: 16, opacity: 0.7 }} />
            </button>

            <button
              onClick={() => setNotificationOpen(true)}
              title="Notifications"
              className="hidden sm:flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
                position: 'relative',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {notifications.length > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: -4, 
                  right: -4, 
                  width: 16, 
                  height: 16, 
                  borderRadius: '50%', 
                  background: 'var(--red)', 
                  color: '#fff', 
                  fontSize: 9, 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '2px solid var(--bg)'
                }}>
                  {notifications.length}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                // Export stories data as JSON
                const dataStr = JSON.stringify(stories, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `pulse-pro-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                toast.success('Data exported successfully');
                // Add notification for export
                addNotification({
                  type: 'success',
                  title: 'Data Exported',
                  message: `Exported ${stories.length} articles to JSON`,
                  timestamp: new Date().toISOString(),
                });
              }}
              title="Export Data"
              className="hidden sm:flex items-center justify-center flex-shrink-0"
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text2)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--surface2)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)', padding: '24px' }}>
          <div className="max-w-7xl mx-auto space-y-8 animate-fade-in">
            {/* View Rendering — URL-based routing with lazy-loaded views */}
            <BulkOperationsProvider value={bulkOperationsValue}>
              <StoriesProvider value={storiesValue}>
                <Suspense fallback={<Skeleton type="page" />}>
                  <Routes>
              <Route path="/analytics" element={<AnalyticsView onBack={() => setCurrentView('dashboard')} />} />
              {/* Alias: /metrics redirects to same AnalyticsView as /analytics */}
              <Route path="/metrics" element={<AnalyticsView onBack={() => setCurrentView('dashboard')} />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/media" element={<MediaView />} />
              <Route path="/podcast" element={<PodcastView />} />
              <Route path="/research" element={<ResearchView />} />
              <Route path="/articles" element={
                <ArticlesView
                  selectedPlatforms={selectedPlatforms}
                  activeTheme={activeTheme}
                  handleRunPipeline={handleRunPipeline}
                />
              } />
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
                  selectedPlatforms={selectedPlatforms}
                  activeTheme={activeTheme}
                  handleRunPipeline={handleRunPipeline}
                />
              } />
              <Route path="*" element={<NotFoundView />} />
            </Routes>
            </Suspense>
              </StoriesProvider>
            </BulkOperationsProvider>
          </div>
        </main>

        <footer className="flex-shrink-0 py-3 text-center" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <p className="text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2" style={{ color: 'var(--text3)' }}>
            <Zap className="w-3 h-3" /> Powered by AI Pulse Pro Engine v2.0
          </p>
        </footer>
      </div>

      {/* Schedule Modal */}
      {scheduleOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)', padding: 16 }}>
          <div className="animate-slide-up" style={{ width: '100%', maxWidth: 520, borderRadius: 20, background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: 0 }}>Automation Engine</h2>
                <p style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.1em', marginTop: 4 }}>
                  {scheduleNextRun ? `Next run: ${new Date(scheduleNextRun).toLocaleTimeString()}` : 'System Idle'}
                </p>
              </div>
              <button onClick={() => setScheduleOpen(false)} style={{ padding: 8, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
              {scheduleError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>
                  {scheduleError}
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div
                  style={{ width: 44, height: 26, borderRadius: 13, position: 'relative', transition: 'background 0.2s', background: scheduleEnabled ? 'var(--accent)' : 'var(--surface2)', border: '1px solid var(--border2)', flexShrink: 0 }}
                >
                  <div style={{ position: 'absolute', top: 3, width: 18, height: 18, background: '#fff', borderRadius: '50%', transition: 'left 0.2s', left: scheduleEnabled ? 22 : 3 }} />
                </div>
                <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} style={{ display: 'none' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Enable Automated Syncing</span>
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Active Days</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                  {dayOptions.map((d) => (
                    <button
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      style={{
                        padding: '10px 0', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s',
                        background: scheduleDays.includes(d.key) ? 'var(--accent)' : 'var(--surface2)',
                        border: `1px solid ${scheduleDays.includes(d.key) ? 'var(--accent)' : 'var(--border)'}`,
                        color: scheduleDays.includes(d.key) ? '#fff' : 'var(--text2)',
                      }}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Daily Execution Time</label>
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 16, fontWeight: 700, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setScheduleOpen(false)} style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, color: 'var(--text2)', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 10 }}>Close</button>
              <button
                onClick={saveSchedule}
                disabled={scheduleLoading}
                style={{ padding: '9px 22px', background: 'var(--accent)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: scheduleLoading ? 'not-allowed' : 'pointer', opacity: scheduleLoading ? 0.7 : 1, transition: 'all 0.15s' }}
              >
                {scheduleLoading ? 'Calibrating…' : 'Commit Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (triggered by keyboard shortcut or BulkActionsBar) */}
      {showDeleteConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(14px)', padding: 16 }}>
          <div className="animate-slide-up" style={{ width: '100%', maxWidth: 440, borderRadius: 20, background: 'var(--bg2)', border: '1px solid var(--border2)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', margin: 0 }}>
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'Article' : 'Articles'}?
              </h2>
              <button onClick={() => setShowDeleteConfirmModal(false)} style={{ padding: 8, borderRadius: '50%', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>
                This action is irreversible. All selected articles and their generated content will be permanently deleted.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, padding: '16px 28px', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                style={{ padding: '9px 18px', fontSize: 13, fontWeight: 600, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeBulkDelete(Array.from(selectedIds))}
                style={{ padding: '9px 22px', background: 'var(--red)', color: '#fff', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
              >
                <Trash2 style={{ width: 14, height: 14 }} />
                Delete {selectedIds.size} {selectedIds.size === 1 ? 'Article' : 'Articles'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Confirmation Dialog (Requirements 1.1, 1.5) */}
      <BulkConfirmationDialog
        isOpen={bulkConfirmation.isOpen}
        operationName={bulkConfirmation.operationName}
        itemCount={bulkConfirmation.itemCount}
        onConfirm={bulkConfirmation.onConfirm}
        onCancel={() => setBulkConfirmation({ isOpen: false, operationName: '', itemCount: 0, onConfirm: null })}
      />

      {/* Per-Platform Schedule Modal (from StoryCard) */}
      <BulkScheduleModal
        open={showPlatformScheduleModal}
        onClose={() => {
          setShowPlatformScheduleModal(false);
          setPlatformScheduleData(null);
        }}
        onSchedule={handlePlatformSchedule}
        selectedCount={1}
        preselectedPlatform={platformScheduleData?.platform || null}
        scheduleAllPlatforms={platformScheduleData?.platforms || []}
      />

      {/* Notification Panel */}
      <NotificationPanel
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
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
