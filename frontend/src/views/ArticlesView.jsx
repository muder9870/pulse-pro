import React, { useState, useCallback } from 'react';
import { Activity, Loader2, CheckCircle } from 'lucide-react';
import { FixedSizeList as List } from 'react-window';
import StoryCard from '../components/StoryCard';
import FilterBar from '../components/FilterBar';
import Skeleton from '../components/Skeleton';
import Checkbox from '../components/ui/Checkbox';
import BulkActionsBar from '../components/BulkActionsBar';
import BulkOperationProgress from '../components/BulkOperationProgress';
import BulkOperationError from '../components/BulkOperationError';
import FeatureErrorBoundary from '../components/FeatureErrorBoundary';
import EmptyFeed from '../components/EmptyFeed';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkOperations } from '../context/BulkOperationsContext';
import { useStories as useStoriesContext } from '../context/StoriesContext';

const ArticlesView = ({
  selectedPlatforms,
  activeTheme,
  handleRunPipeline,
}) => {
  const queryClient = useQueryClient();
  
  // Get data from context (T10 refactoring)
  const {
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
  } = useBulkOperations();
  
  const {
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
  } = useStoriesContext();

  // Score filter tab state
  const [scoreFilter, setScoreFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('score'); // 'score' | 'date'
  const [showFilters, setShowFilters] = useState(false);

  const scoreFiltered = React.useMemo(() => {
    let list = [...filteredStories];
    if (scoreFilter === 'high') list = list.filter(s => (s.total_score || 0) >= 50);
    else if (scoreFilter === 'mid')  list = list.filter(s => { const sc = s.total_score || 0; return sc >= 40 && sc < 50; });
    else if (scoreFilter === 'low')  list = list.filter(s => (s.total_score || 0) < 40);
    if (sortOrder === 'date') list.sort((a, b) => new Date(b.fetched_at || b.created_at || 0) - new Date(a.fetched_at || a.created_at || 0));
    else list.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    return list;
  }, [filteredStories, scoreFilter, sortOrder]);

  // Select all operates on scoreFiltered (what user sees)
  const allVisibleSelected = scoreFiltered.length > 0 && scoreFiltered.every(s => selectedIds.has(s.id));
  const someVisibleSelected = scoreFiltered.some(s => selectedIds.has(s.id)) && !allVisibleSelected;

  const handleSelectAllVisible = useCallback(() => {
    const ids = scoreFiltered.map(s => s.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    ids.forEach(id => {
      const isCurrentlySelected = selectedIds.has(id);
      if (allSelected && isCurrentlySelected) toggleSelection(id);
      else if (!allSelected && !isCurrentlySelected) toggleSelection(id);
    });
  }, [scoreFiltered, selectedIds, toggleSelection]);

  const highCount = filteredStories.filter(s => (s.total_score || 0) >= 50).length;
  const midCount  = filteredStories.filter(s => { const sc = s.total_score || 0; return sc >= 40 && sc < 50; }).length;
  const lowCount  = filteredStories.filter(s => (s.total_score || 0) < 40).length;

  const scoreTabs = [
    { key: 'all',  label: `All (${filteredStories.length})`,  color: 'var(--text)',   bg: 'var(--surface2)',  border: 'var(--border2)' },
    { key: 'high', label: `High Score (${highCount})`,        color: 'var(--green)',  bg: 'var(--green-dim)', border: 'var(--green)' },
    { key: 'mid',  label: `Mid Score (${midCount})`,          color: 'var(--amber)',  bg: 'var(--amber-dim)', border: 'var(--amber)' },
    { key: 'low',  label: `Low Score (${lowCount})`,          color: 'var(--text2)',  bg: 'var(--surface2)',  border: 'var(--border)' },
  ];

  // T14: Use virtualization for large lists (>50 items) to improve performance
  const VIRTUALIZATION_THRESHOLD = 50;
  const useVirtualization = scoreFiltered.length > VIRTUALIZATION_THRESHOLD;
  const ITEM_HEIGHT = 200; // Approximate height of StoryCard in pixels

  // Virtualized row renderer
  const VirtualRow = useCallback(({ index, style }) => {
    const story = scoreFiltered[index];
    return (
      <div style={style}>
        <div style={{ padding: '0 0 8px 0' }}>
          <StoryCard
            key={story.id}
            story={story}
            initialPlatforms={selectedPlatforms}
            isSelected={selectedIds.has(story.id)}
            onToggleSelection={() => toggleSelection(story.id)}
            hasAnySelection={selectedIds.size > 0}
          />
        </div>
      </div>
    );
  }, [scoreFiltered, selectedPlatforms, selectedIds, toggleSelection]);

  return (
    <FeatureErrorBoundary name="Articles">
      <div style={{ paddingBottom: 80 }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, textTransform: 'capitalize' }}>
              {activeSource ? (typeof activeSource === 'string' ? activeSource : activeSource?.name) : 'Article Feed'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
              AI Research Assistant · Deep technical analysis of latest papers
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {activeSource && (
              <button
                onClick={() => handleSourceSelect(null)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              >
                All Sources
              </button>
            )}
            <button
              onClick={() => setShowFilters(f => !f)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: `1px solid ${showFilters ? 'var(--accent)' : 'var(--border2)'}`, background: showFilters ? 'var(--accent-glow)' : 'transparent', color: showFilters ? 'var(--accent)' : 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
            >
              Filter {showFilters ? '▴' : '▾'}
            </button>
            <button
              onClick={() => setSortOrder(s => s === 'score' ? 'date' : 'score')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
            >
              Sort: {sortOrder === 'score' ? 'Score' : 'Date'} ▾
            </button>
            {filteredStories.length > 0 && (
              <button
                onClick={() => handleBulkGenerate(filteredStories.map(s => s.id))}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--accent)', background: 'var(--accent)', color: '#fff', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}
              >
                Launch All {filteredStories.length} →
              </button>
            )}
          </div>
        </div>

        {/* ── Score Filter Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {scoreTabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setScoreFilter(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '5px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.15s',
                background: scoreFilter === tab.key ? tab.bg : 'transparent',
                border: `1px solid ${scoreFilter === tab.key ? tab.border : 'var(--border)'}`,
                color: scoreFilter === tab.key ? tab.color : 'var(--text2)',
              }}
            >
              {tab.label}
            </button>
          ))}

          {/* Select All checkbox */}
          {scoreFiltered.length > 0 && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onChange={handleSelectAllVisible}
              />
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>
                Select All
                {selectedIds.size > 0 && (
                  <span style={{ marginLeft: 4, color: 'var(--accent)', fontWeight: 600 }}>
                    ({selectedIds.size})
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* ── Filter Bar (collapsible, sleek) ── */}
        {showFilters && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 14px', marginBottom: 14 }}>
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              sources={uniqueSources}
              vertical={false}
            />
          </div>
        )}

        {/* ── Article Count + Score tier label ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            {scoreFiltered.length} {scoreFilter !== 'all' ? `${scoreFilter.charAt(0).toUpperCase() + scoreFilter.slice(1)} Score` : ''} Articles
          </div>
        </div>

        {/* ── Article List ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 80 }}>
          {loading && stories.length === 0 ? (
            <Skeleton variant="card" count={3} />
          ) : !loading && stories.length === 0 ? (
            <EmptyFeed onRunPipeline={handleRunPipeline} activeTheme={activeTheme} />
          ) : scoreFiltered.length === 0 ? (
            <div style={{ padding: '80px 24px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              <Activity style={{ width: 40, height: 40, color: 'var(--text3)', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No articles match this filter</div>
              <button
                onClick={() => { setScoreFilter('all'); handleSourceSelect(null); queryClient.invalidateQueries(['stories']); }}
                style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--accent)', background: 'var(--accent-glow)', color: 'var(--accent)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              {/* T14: Use virtualized list for large datasets (>50 items) */}
              {useVirtualization ? (
                <div style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
                  <List
                    height={Math.min(window.innerHeight - 400, scoreFiltered.length * ITEM_HEIGHT)}
                    itemCount={scoreFiltered.length}
                    itemSize={ITEM_HEIGHT}
                    width="100%"
                    overscanCount={3}
                  >
                    {VirtualRow}
                  </List>
                </div>
              ) : (
                // Regular rendering for small lists
                scoreFiltered.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    initialPlatforms={selectedPlatforms}
                    isSelected={selectedIds.has(story.id)}
                    onToggleSelection={() => toggleSelection(story.id)}
                    hasAnySelection={selectedIds.size > 0}
                  />
                ))
              )}

              {hasNextPage && (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 24 }}>
                  <button
                    onClick={fetchNextPage}
                    disabled={isFetchingNextPage}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 24px', borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 500, cursor: isFetchingNextPage ? 'not-allowed' : 'pointer', opacity: isFetchingNextPage ? 0.6 : 1 }}
                  >
                    {isFetchingNextPage ? <><Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> Loading…</> : 'View Older Articles'}
                  </button>
                </div>
              )}

              {!hasNextPage && scoreFiltered.length > 0 && (
                <div style={{ textAlign: 'center', paddingTop: 24 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 16px', borderRadius: 20, border: '1px solid var(--green-dim)', background: 'var(--green-dim)', color: 'var(--green)', fontSize: 11, fontWeight: 600 }}>
                    <CheckCircle style={{ width: 13, height: 13 }} /> End of Feed
                  </div>
                </div>
              )}
            </>
          )}
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

      <BulkOperationProgress
        operationName={bulkOperationState.operationName}
        current={bulkOperationState.current}
        total={bulkOperationState.total}
        isActive={bulkOperationState.isActive}
      />

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

export default ArticlesView;
