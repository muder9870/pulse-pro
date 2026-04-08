import React, { useState, useCallback } from 'react';
import Input from './ui/Input';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { useDebounce } from '../hooks/useDebounce';
import { useSources } from '../hooks/useStories';
import { Search, Filter, X, ChevronDown, Calendar, Tag, Globe, SlidersHorizontal } from 'lucide-react';

const FilterBar = ({ filters = {}, onFilterChange, onRefresh, isLoading = false }) => {
  const { data: sources = [] } = useSources();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search || '');

  const debouncedSearch = useDebounce(searchValue, 300);

  React.useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      onFilterChange?.({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((key, value) => {
    onFilterChange?.({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleClearAll = useCallback(() => {
    setSearchValue('');
    onFilterChange?.({ source: '', scoreRange: '', dateRange: '', hasContent: false, analyzed: false, deepDive: false, search: '' });
  }, [onFilterChange]);

  const hasActiveFilters = filters.source || filters.scoreRange || filters.dateRange || filters.hasContent || filters.analyzed || filters.deepDive || filters.search;

  const sourceList = Array.isArray(sources) ? sources : [];

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 space-y-4">
      {/* Mobile Filter Toggle */}
      <div className="flex items-center gap-2 lg:hidden">
        <Input
          type="text"
          placeholder="Search stories..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          icon={SlidersHorizontal}
        >
          Filters
          {hasActiveFilters && (
            <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
              {Object.values(filters).filter(Boolean).length}
            </span>
          )}
        </Button>
      </div>

      {/* Desktop Filters / Mobile Expanded */}
      <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block`}>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 hidden lg:block">
            <Input
              type="text"
              placeholder="Search stories..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              fullWidth
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={filters.source || ''}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              {sourceList.map(source => (
                <option key={source.name} value={source.name}>
                  {source.name} ({source.count})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-40">
            <select
              value={filters.scoreRange || ''}
              onChange={(e) => handleFilterChange('scoreRange', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Any Score</option>
              <option value="85-100">High (85-100)</option>
              <option value="70-84">Medium (70-84)</option>
              <option value="0-69">Low (0-69)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              icon={Filter}
            >
              Advanced
              <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearAll} icon={X}>
                Clear
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} icon={Search} />
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-500 dark:text-gray-400">Active:</span>
          {filters.source && (
            <Badge variant="secondary">
              <Globe className="w-3 h-3 mr-1 inline" />{filters.source}
              <button onClick={() => handleFilterChange('source', '')} className="ml-1"><X className="w-3 h-3 inline" /></button>
            </Badge>
          )}
          {filters.scoreRange && (
            <Badge variant="secondary">
              Score: {filters.scoreRange}
              <button onClick={() => handleFilterChange('scoreRange', '')} className="ml-1"><X className="w-3 h-3 inline" /></button>
            </Badge>
          )}
          {filters.hasContent && (
            <Badge variant="secondary">
              Has Content
              <button onClick={() => handleFilterChange('hasContent', false)} className="ml-1"><X className="w-3 h-3 inline" /></button>
            </Badge>
          )}
          {filters.analyzed && (
            <Badge variant="secondary">
              Analyzed
              <button onClick={() => handleFilterChange('analyzed', false)} className="ml-1"><X className="w-3 h-3 inline" /></button>
            </Badge>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200 dark:border-slate-700 pt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date Range</label>
              <select
                value={filters.dateRange || ''}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Any Time</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.hasContent || false}
                onChange={(e) => handleFilterChange('hasContent', e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              Has Generated Content
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.analyzed || false}
                onChange={(e) => handleFilterChange('analyzed', e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              Analyzed
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.deepDive || false}
                onChange={(e) => handleFilterChange('deepDive', e.target.checked)}
                className="rounded border-gray-300 dark:border-slate-600"
              />
              Deep Dive
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
