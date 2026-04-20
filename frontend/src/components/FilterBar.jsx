import React, { useState, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useSources } from '../hooks/useStories';
import { Search, X } from 'lucide-react';

const sel = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  padding: '5px 10px',
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'var(--font-body)',
  outline: 'none',
  cursor: 'pointer',
  width: '100%',
};

const FilterBar = ({ filters = {}, onFilterChange }) => {
  const { data: sources = [] } = useSources();
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const debouncedSearch = useDebounce(searchValue, 300);

  React.useEffect(() => {
    if (debouncedSearch !== (filters.search || '')) {
      onFilterChange?.({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const set = useCallback((key, value) => {
    onFilterChange?.({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const clearAll = useCallback(() => {
    setSearchValue('');
    onFilterChange?.({ source: '', scoreRange: '', dateRange: '', hasContent: false, analyzed: false, deepDive: false, search: '' });
  }, [onFilterChange]);

  const hasActive = filters.source || filters.scoreRange || filters.dateRange || filters.hasContent || filters.analyzed || filters.deepDive || filters.search;
  const sourceList = Array.isArray(sources) ? sources : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Row 1: search + source + score + date + clear */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', flex: '1 1 160px', minWidth: 140 }}>
          <Search style={{ width: 12, height: 12, color: 'var(--text3)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search…"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font-body)', width: '100%' }}
          />
          {searchValue && (
            <button onClick={() => setSearchValue('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: 0 }}>
              <X style={{ width: 11, height: 11 }} />
            </button>
          )}
        </div>

        {/* Source */}
        <select value={filters.source || ''} onChange={e => set('source', e.target.value)} style={{ ...sel, flex: '0 0 140px' }}>
          <option value="">All Sources</option>
          {sourceList.map(s => <option key={s.name} value={s.name}>{s.name} ({s.count})</option>)}
        </select>

        {/* Score */}
        <select value={filters.scoreRange || ''} onChange={e => set('scoreRange', e.target.value)} style={{ ...sel, flex: '0 0 130px' }}>
          <option value="">Any Score</option>
          <option value="85-100">High (85-100)</option>
          <option value="70-84">Medium (70-84)</option>
          <option value="0-69">Low (0-69)</option>
        </select>

        {/* Date */}
        <select value={filters.dateRange || ''} onChange={e => set('dateRange', e.target.value)} style={{ ...sel, flex: '0 0 120px' }}>
          <option value="">Any Time</option>
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>

        {/* Advanced toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${showAdvanced ? 'var(--accent)' : 'var(--border)'}`, background: showAdvanced ? 'var(--accent-glow)' : 'transparent', color: showAdvanced ? 'var(--accent)' : 'var(--text2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          More {showAdvanced ? '▴' : '▾'}
        </button>

        {hasActive && (
          <button
            onClick={clearAll}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--red)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            <X style={{ width: 11, height: 11 }} /> Clear
          </button>
        )}
      </div>

      {/* Row 2: advanced checkboxes */}
      {showAdvanced && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          {[
            { key: 'hasContent', label: 'Has Content' },
            { key: 'analyzed',   label: 'Analyzed' },
            { key: 'deepDive',   label: 'Deep Dive' },
          ].map(item => (
            <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={filters[item.key] || false}
                onChange={e => set(item.key, e.target.checked)}
                style={{ accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              {item.label}
            </label>
          ))}
        </div>
      )}

      {/* Active filter chips */}
      {hasActive && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.source && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid var(--accent)' }}>
              {filters.source}
              <button onClick={() => set('source', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0 }}><X style={{ width: 10, height: 10 }} /></button>
            </span>
          )}
          {filters.scoreRange && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--amber-dim)', color: 'var(--amber)', border: '1px solid var(--amber)' }}>
              Score: {filters.scoreRange}
              <button onClick={() => set('scoreRange', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', padding: 0 }}><X style={{ width: 10, height: 10 }} /></button>
            </span>
          )}
          {filters.hasContent && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600, background: 'var(--teal-dim)', color: 'var(--teal)', border: '1px solid var(--teal)' }}>
              Has Content
              <button onClick={() => set('hasContent', false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)', padding: 0 }}><X style={{ width: 10, height: 10 }} /></button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterBar;
