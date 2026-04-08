import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import Input from './ui/Input';

/**
 * SearchBar Component
 * 
 * Search input with debounce and clear button.
 * 
 * @param {Function} props.onSearch - Search handler (debounced)
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.debounceMs - Debounce delay (default: 300ms)
 */
export default function SearchBar({ 
  onSearch, 
  placeholder = "Search articles by title, source, or tags...",
  debounceMs = 300 
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      onSearch?.(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, onSearch]);

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleClear = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    onSearch?.('');
  }, [onSearch]);

  return (
    <div className="relative max-w-3xl mx-auto mb-6">
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder={placeholder}
          icon={Search}
          iconPosition="left"
          fullWidth
          className="pl-12 pr-12 py-4 shadow-sm hover:shadow-md transition-shadow"
        />
        
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 
                       hover:text-gray-600 transition-colors p-1 rounded-lg
                       hover:bg-gray-100"
            aria-label="Clear search"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Search hint */}
      {query && (
        <div className="absolute top-full left-0 right-0 mt-2 text-sm text-gray-500 px-4">
          Searching for: <span className="font-medium text-gray-700">"{query}"</span>
        </div>
      )}
    </div>
  );
}
