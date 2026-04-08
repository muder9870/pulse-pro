import React, { useState, useCallback } from 'react';

/**
 * Custom hook for managing bulk selection state
 * 
 * @param {Array} items - Array of items to manage selection for
 * @param {string} idKey - Key to use for item identification (default: 'id')
 * @returns {Object} Selection state and methods
 */
export const useBulkSelection = (items = [], idKey = 'id') => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  
  const toggleItem = useCallback((itemId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);
  
  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => item[idKey])));
    }
  }, [items, selectedIds.size, idKey]);
  
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(item => item[idKey])));
  }, [items, idKey]);
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  
  const isSelected = useCallback((itemId) => {
    return selectedIds.has(itemId);
  }, [selectedIds]);
  
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;
  
  const selectedItems = items.filter(item => selectedIds.has(item[idKey]));
  
  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggleItem,
    toggleAll,
    selectAll,
    clearSelection,
  };
};

export default useBulkSelection;
