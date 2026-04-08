import { useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useInfiniteScroll } from './useInfiniteScroll';

/**
 * useVirtualizedStories - Hook for virtualized story list rendering
 * 
 * Optimizes performance for large story lists by only rendering
 * visible items using react-window virtualization.
 * 
 * @param {Array} stories - Full list of stories to display
 * @param {Object} options - Configuration options
 * @returns {Object} Virtualization config and render helpers
 */
export function useVirtualizedStories(stories, options = {}) {
  const {
    itemHeight = 120, // Height of each story card in pixels
    overscan = 5,     // Number of items to render outside viewport
    containerHeight = 600,
  } = options;

  // Data for each item
  const itemData = useMemo(() => stories, [stories]);

  // Calculate total list height
  const totalHeight = useMemo(
    () => stories.length * itemHeight,
    [stories.length, itemHeight]
  );

  // Render function for virtualized items
  const renderItem = useCallback(
    ({ index, style, data }) => {
      const story = data[index];
      return {
        index,
        story,
        style,
        isLast: index === data.length - 1,
      };
    },
    []
  );

  // Virtual list props
  const listProps = useMemo(
    () => ({
      height: containerHeight,
      itemCount: stories.length,
      itemSize: itemHeight,
      itemData,
      overscanCount: overscan,
    }),
    [containerHeight, stories.length, itemHeight, itemData, overscan]
  );

  return {
    listProps,
    renderItem,
    totalHeight,
    itemCount: stories.length,
    isEmpty: stories.length === 0,
  };
}

/**
 * VirtualizedStoryList Component
 * 
 * Renders a virtualized list of stories for better performance
 * with large datasets.
 */
export function VirtualizedStoryList({
  stories,
  renderStory,
  itemHeight = 120,
  containerHeight = 600,
  onLoadMore,
  hasMore = false,
  className = '',
}) {
  const { listProps, itemData } = useVirtualizedStories(stories, {
    itemHeight,
    containerHeight,
  });

  // Infinite scroll handling
  const { sentinelRef } = useInfiniteScroll({
    onLoadMore,
    hasMore,
  });

  // Row renderer
  const Row = useCallback(
    ({ index, style }) => {
      const story = itemData[index];
      const isLast = index === itemData.length - 1;

      return (
        <div style={style} className="px-4">
          {renderStory(story, index)}
          {isLast && hasMore && (
            <div ref={sentinelRef} className="h-8 flex items-center justify-center">
              <span className="text-sm text-slate-500">Loading more...</span>
            </div>
          )}
        </div>
      );
    },
    [itemData, renderStory, sentinelRef, hasMore]
  );

  if (stories.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <p className="text-slate-500">No stories found</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <List {...listProps}>
        {Row}
      </List>
    </div>
  );
}

export default useVirtualizedStories;
