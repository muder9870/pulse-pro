import React from 'react';
import { AlertTriangle, RefreshCw, Search } from 'lucide-react';

const EmptyStories = ({ onRefresh, filters }) => (
  <div className="text-center py-12">
    <div className="mb-4">
      <AlertTriangle className="w-16 h-16 mx-auto text-gray-300" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No stories found
    </h3>
    <p className="text-gray-500 mb-6">
      {filters.active 
        ? "Try adjusting your filters or search terms."
        : "No stories available at the moment."}
    </p>
    <div className="space-x-4">
      <button 
        onClick={onRefresh}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </button>
      {filters.active && (
        <button 
          onClick={filters.clear}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Clear Filters
        </button>
      )}
    </div>
  </div>
);

const EmptySearch = ({ query, onClear }) => (
  <div className="text-center py-12">
    <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No results for "{query}"
    </h3>
    <p className="text-gray-500 mb-6">
      Try different keywords or browse all stories.
    </p>
    <button 
      onClick={onClear}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    >
      Clear Search
    </button>
  </div>
);

export { EmptyStories, EmptySearch };
