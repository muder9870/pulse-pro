import React from 'react';

/**
 * Enhanced Skeleton Components with Loading States
 * 
 * Provides comprehensive skeleton loading states for different UI patterns:
 * - Story cards, filter bars, content areas
 * - Animated placeholders with shimmer effect
 * - Responsive and accessible loading states
 */

const StoryCardSkeleton = ({ count = 1 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="h-3 bg-gray-200 rounded w-20"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="mt-4 space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/5"></div>
          </div>
          
          {/* Tags skeleton */}
          <div className="mt-4 flex items-center space-x-2">
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-14 bg-gray-200 rounded-full"></div>
          </div>
          
          {/* Actions skeleton */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const FilterBarSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4 animate-pulse">
    {/* Search and filters row */}
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Search input */}
      <div className="flex-1">
        <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
      </div>
      
      {/* Dropdown filters */}
      <div className="w-full sm:w-48">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
      
      <div className="w-full sm:w-32">
        <div className="h-10 bg-gray-200 rounded-lg"></div>
      </div>
      
      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <div className="h-8 w-24 bg-gray-200 rounded"></div>
        <div className="h-8 w-16 bg-gray-200 rounded"></div>
        <div className="h-8 w-16 bg-gray-200 rounded"></div>
      </div>
    </div>
    
    {/* Active filters skeleton */}
    <div className="flex items-center space-x-2">
      <div className="h-6 w-20 bg-gray-200 rounded"></div>
      <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
      <div className="h-6 w-28 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

const ContentSkeleton = ({ lines = 5, showTitle = true }) => (
  <div className="animate-pulse space-y-4">
    {showTitle && (
      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
    )}
    
    {Array.from({ length: lines }, (_, index) => (
      <div 
        key={index} 
        className="h-4 bg-gray-200 rounded"
        style={{ 
          width: `${Math.max(60, 100 - (index * 10))}%` 
        }}
      ></div>
    ))}
  </div>
);

const TableSkeleton = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="border-b border-gray-200 pb-4 mb-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }, (_, index) => (
          <div key={index} className="h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    </div>
    
    {/* Rows */}
    <div className="space-y-4">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-100 pb-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <div 
                key={colIndex} 
                className="h-4 bg-gray-200 rounded"
                style={{ 
                  width: colIndex === 0 ? '60%' : '80%' 
                }}
              ></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ListSkeleton = ({ count = 5, showAvatar = true }) => (
  <div className="space-y-4 animate-pulse">
    {Array.from({ length: count }, (_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
        {showAvatar && (
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0"></div>
        )}
        
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          <div className="h-8 w-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    ))}
  </div>
);

const ButtonLoader = ({ size = 'md', text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
    lg: 'h-12 px-6 text-base'
  };
  
  return (
    <div className={`${sizeClasses[size]} inline-flex items-center justify-center rounded-md border border-gray-300 bg-gray-100 text-gray-500 animate-pulse`}>
      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
      {text}
    </div>
  );
};

const PageSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Header */}
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    
    {/* Filter bar */}
    <div className="h-16 bg-gray-200 rounded-lg"></div>
    
    {/* Content cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          </div>
          <div className="flex items-center justify-between">
            <div className="h-8 w-24 bg-gray-200 rounded"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
    
    {/* Pagination */}
    <div className="flex items-center justify-center space-x-2">
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
      <div className="h-8 w-8 bg-gray-200 rounded"></div>
    </div>
  </div>
);

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };
  
  return (
    <div className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin ${className}`}></div>
  );
};

export { 
  StoryCardSkeleton, 
  FilterBarSkeleton, 
  ContentSkeleton, 
  TableSkeleton, 
  ListSkeleton, 
  ButtonLoader, 
  PageSkeleton, 
  LoadingSpinner 
};

// Default export for backward compatibility
const Skeleton = ({ type = 'content', ...props }) => {
  switch (type) {
    case 'storyCard':
      return <StoryCardSkeleton {...props} />;
    case 'filterBar':
      return <FilterBarSkeleton {...props} />;
    case 'content':
      return <ContentSkeleton {...props} />;
    case 'table':
      return <TableSkeleton {...props} />;
    case 'list':
      return <ListSkeleton {...props} />;
    case 'page':
      return <PageSkeleton {...props} />;
    default:
      return <ContentSkeleton {...props} />;
  }
};

export default Skeleton;
