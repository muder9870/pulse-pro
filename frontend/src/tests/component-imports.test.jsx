/**
 * Component Import Sanity Test
 * Verifies every component imported by App.jsx resolves to a non-undefined value.
 * This catches the exact cause of React error #130.
 */
import { describe, it, expect } from 'vitest';

import StoryCard from '../components/StoryCard';
import EnhancedAnalytics from '../components/EnhancedAnalytics';
import ContentCalendar from '../components/ContentCalendar';
import MediaManager from '../components/MediaManager';
import ResearchView from '../components/ResearchView';
import Sidebar from '../components/Sidebar';
import DailyIntelligence from '../components/DailyIntelligence';
import SettingsView from '../components/SettingsView';
import ToastContainer from '../components/ToastContainer';
import Skeleton from '../components/Skeleton';
import DashboardStats from '../components/DashboardStats';
import QuickActions from '../components/QuickActions';
import FilterBar from '../components/FilterBar';
import PodcastView from '../components/PodcastView';
import BulkActionsBar from '../components/BulkActionsBar';
import BulkOperationProgress from '../components/BulkOperationProgress';
import BulkOperationError from '../components/BulkOperationError';
import PipelineStatus from '../components/PipelineStatus';
import Checkbox from '../components/ui/Checkbox';
import { Button } from '../components/ui';
import { ToastProvider, useToastContext } from '../hooks/useToast';

describe('All App.jsx component imports resolve to non-undefined', () => {
  const components = {
    StoryCard,
    EnhancedAnalytics,
    ContentCalendar,
    MediaManager,
    ResearchView,
    Sidebar,
    DailyIntelligence,
    SettingsView,
    ToastContainer,
    Skeleton,
    DashboardStats,
    QuickActions,
    FilterBar,
    PodcastView,
    BulkActionsBar,
    BulkOperationProgress,
    BulkOperationError,
    PipelineStatus,
    Checkbox,
    Button,
    ToastProvider,
    useToastContext,
  };

  for (const [name, component] of Object.entries(components)) {
    it(`${name} is not undefined`, () => {
      expect(component, `${name} resolved to undefined — this causes React error #130`).not.toBeUndefined();
    });
  }
});
