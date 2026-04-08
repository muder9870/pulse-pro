import React from 'react';
import { Activity, Search, Loader2, CheckCircle } from 'lucide-react';
import StoryCard from '../components/StoryCard';
import DailyIntelligence from '../components/DailyIntelligence';
import DashboardStats from '../components/DashboardStats';
import FilterBar from '../components/FilterBar';
import PipelineStatus from '../components/PipelineStatus';
import Skeleton from '../components/Skeleton';
import Checkbox from '../components/ui/Checkbox';
import { Button } from '../components/ui';
import BulkActionsBar from '../components/BulkActionsBar';
import BulkOperationProgress from '../components/BulkOperationProgress';
import BulkOperationError from '../components/BulkOperationError';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import EmptyFeed from '../components/EmptyFeed';
import { useQueryClient } from '@tanstack/react-query';

/**
 * DashboardView — the Intelligence Feed view.
 *
 * All state lives in AppContent and is passed as props.
 * This component is purely presentational — it renders what it receives.
 */
const DashboardView = ({
  // Data
  stories,
  loading,
  filteredStories,
  uniqueSources,
  selectedPlatforms,
  activeTheme,
  activeSource,
  // Pagination — server-side via useInfiniteQuery
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  // Filters
  filters,
  setFilters,
  // Selection
  selectedIds,
  toggleSelection,
  handleSelectAllFiltered,
  getSelectAllState,
  clearSelection,
  // Bulk operation state
  bulkOperationState,
  setBulkOperationState,
  bulkOperationError,
  setBulkOperationError,
  // Modal state
  showTagModal,
  setShowTagModal,
  showScheduleModal,
  setShowScheduleModal,
  showDeleteConfirmModal,
  setShowDeleteConfirmModal,
  // Handlers
  handleBulkGenerate,
  handleBulkSchedule,
  handleBulkTag,
  handleBulkExport,
  handleBulkMarkPosted,
  handleBulkDelete,
  handleRunPipeline,
  handleSourceSelect,
}) => {
  const queryClient = useQueryClient();

  return (
    <FeatureErrorBoundary name="Dashboard">
      <div className="space-y-8">
        {/* View Title Section */}
        {!activeSource ? (
          <div className="flex items-end justify-between border-b border-white/10 pb-6 mb-4">
            <div>
              <h1 className={`text-3xl font-black tracking-tight capitalize ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Dashboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Manage your AI content ecosystem
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-white/10 pb-6 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-black rounded uppercase border border-indigo-500/20">Source Folder</span>
                <h1 className={`text-3xl font-black tracking-tight capitalize ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {typeof activeSource === 'string' ? activeSource : activeSource?.name}
                </h1>
              </div>
              <p className="text-slate-500 text-sm italic">
                All gathered data from {typeof activeSource === 'string' ? activeSource : activeSource?.name}
              </p>
            </div>
            <button
              onClick={() => handleSourceSelect(null)}
              className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              Back to All
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* Intelligence Layer */}
          <DailyIntelligence onRunPipeline={handleRunPipeline} />

          {/* Main Dashboard Stats */}
          <DashboardStats activeTheme={activeTheme} />

          {/* Filter Panel */}
          <div className={`backdrop-blur-xl rounded-3xl border p-4 shadow-xl mb-6 transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                <Search className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Dashboard Tuning & Perspective</h3>
            </div>

            <PipelineStatus />

            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              sources={uniqueSources}
              vertical={false}
            />
          </div>

          {/* Content Feed Section */}
          <div className="space-y-6">
            <div className={`flex items-center justify-between pb-4 border-b transition-colors duration-500 ${activeTheme === 'dark' ? 'border-white/10' : 'border-slate-100'}`}>
              <div className="flex items-center gap-4">
                <h2 className={`text-xl font-bold transition-colors duration-500 ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {activeSource ? `${typeof activeSource === 'string' ? activeSource : activeSource?.name} Items` : 'Intelligence Feed'}
                </h2>
                {/* Select All Checkbox */}
                {filteredStories.length > 0 && (
                  <div className={`flex items-center gap-2 pl-4 border-l ${activeTheme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                    <Checkbox
                      checked={getSelectAllState().checked}
                      indeterminate={getSelectAllState().indeterminate}
                      onChange={handleSelectAllFiltered}
                      className="!gap-2"
                    />
                    <span className={`text-xs font-medium ${activeTheme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Select All
                      {selectedIds.size > 0 && (
                        <span className="ml-1 text-indigo-400 font-bold">
                          ({selectedIds.size})
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${activeTheme === 'dark' ? 'text-slate-400 bg-slate-800/50 border-white/10' : 'text-slate-400 bg-white border-slate-200'}`}>
                {filteredStories.length} Matches
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {loading && stories.length === 0 ? (
                <Skeleton variant="card" count={3} />
              ) : !loading && stories.length === 0 ? (
                // No stories at all — fresh install or pipeline never run
                <EmptyFeed onRunPipeline={handleRunPipeline} activeTheme={activeTheme} />
              ) : filteredStories.length === 0 ? (
                // Stories exist but current filters hide them all
                <div className={`py-20 text-center rounded-2xl border-2 border-dashed transition-colors duration-500 ${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200'}`}>
                  <Activity className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 italic">No stories match your current perspective.</p>
                  <button
                    onClick={() => {
                      handleSourceSelect(null);
                      queryClient.invalidateQueries(['stories']);
                    }}
                    className="mt-4 text-indigo-600 font-bold hover:underline"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {filteredStories.map((story) => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      initialPlatforms={selectedPlatforms}
                      isSelected={selectedIds.has(story.id)}
                      onToggleSelection={() => toggleSelection(story.id)}
                      hasAnySelection={selectedIds.size > 0}
                    />
                  ))}

                  {hasNextPage && (
                    <div className="flex justify-center pt-10">
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={fetchNextPage}
                        disabled={isFetchingNextPage}
                        className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-12 rounded-2xl font-black uppercase tracking-widest transition-all"
                      >
                        {isFetchingNextPage ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Loading...
                          </span>
                        ) : (
                          'Load More Articles'
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {!hasNextPage && filteredStories.length > 0 && (
                    <div className="text-center py-10">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm text-slate-400">You&apos;ve reached the end</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkGenerate={handleBulkGenerate}
        onBulkSchedule={handleBulkSchedule}
        onBulkTag={handleBulkTag}
        onBulkExport={handleBulkExport}
        onBulkMarkPosted={handleBulkMarkPosted}
        onBulkDelete={() => setShowDeleteConfirmModal(true)}
        showTagModal={showTagModal}
        setShowTagModal={setShowTagModal}
        showScheduleModal={showScheduleModal}
        setShowScheduleModal={setShowScheduleModal}
        disabled={bulkOperationState.isActive}
      />

      {/* Bulk Operation Progress Overlay */}
      <BulkOperationProgress
        operationName={bulkOperationState.operationName}
        current={bulkOperationState.current}
        total={bulkOperationState.total}
        isActive={bulkOperationState.isActive}
      />

      {/* Bulk Operation Error */}
      <BulkOperationError
        operationName={bulkOperationError.operationName}
        failedArticles={bulkOperationError.failedArticles}
        onRetry={bulkOperationError.retryHandler}
        onDismiss={() => setBulkOperationError({ isVisible: false, operationName: '', failedArticles: [], retryHandler: null })}
        isVisible={bulkOperationError.isVisible}
      />
    </FeatureErrorBoundary>
  );
};

export default DashboardView;
