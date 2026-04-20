import { useEffect } from 'react';

/**
 * useAppKeyboardShortcuts - Hook for managing application-wide keyboard shortcuts
 * 
 * Handles keyboard shortcuts for bulk operations in the dashboard view.
 * Extracted from App.jsx as part of T9 refactoring.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.currentView - Current active view
 * @param {boolean} options.scheduleOpen - Whether schedule modal is open
 * @param {boolean} options.showDeleteConfirmModal - Whether delete confirmation modal is open
 * @param {boolean} options.showTagModal - Whether tag modal is open
 * @param {boolean} options.showScheduleModal - Whether schedule modal is open
 * @param {Set} options.selectedIds - Set of selected article IDs
 * @param {Function} options.clearSelection - Function to clear all selections
 * @param {number} options.filteredStoriesLength - Number of filtered stories
 * @param {Function} options.handleSelectAllFiltered - Function to select/deselect all filtered stories
 * @param {Function} options.setShowDeleteConfirmModal - Function to show delete confirmation modal
 */
export function useAppKeyboardShortcuts({
  currentView,
  scheduleOpen,
  showDeleteConfirmModal,
  showTagModal,
  showScheduleModal,
  selectedIds,
  clearSelection,
  filteredStoriesLength,
  handleSelectAllFiltered,
  setShowDeleteConfirmModal,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only respond to shortcuts when dashboard view is active (Requirement 12.4)
      if (currentView !== 'dashboard') return;
      
      // Disable shortcuts when any modal is open (Requirement 12.5)
      if (scheduleOpen || showDeleteConfirmModal || showTagModal || showScheduleModal) return;
      
      // Ctrl+A (Cmd+A on Mac) - Select all visible articles (Requirement 12.1)
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault(); // Prevent default browser behavior
        if (filteredStoriesLength > 0) {
          handleSelectAllFiltered();
        }
        return;
      }
      
      // Escape - Clear selection (Requirement 12.2)
      if (event.key === 'Escape' && selectedIds.size > 0) {
        event.preventDefault();
        clearSelection();
        return;
      }
      
      // Delete - Trigger bulk delete confirmation (Requirement 12.3)
      if (event.key === 'Delete' && selectedIds.size > 0) {
        event.preventDefault();
        setShowDeleteConfirmModal(true);
        return;
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    currentView,
    scheduleOpen,
    showDeleteConfirmModal,
    showTagModal,
    showScheduleModal,
    selectedIds.size,
    clearSelection,
    filteredStoriesLength,
    handleSelectAllFiltered,
    setShowDeleteConfirmModal,
  ]);
}

export default useAppKeyboardShortcuts;
