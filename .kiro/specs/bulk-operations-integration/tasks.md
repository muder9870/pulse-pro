# Implementation Plan: Bulk Operations Integration

## Overview

This implementation integrates the existing bulk operations infrastructure (useBulkSelection hook and BulkActionsBar component) into the AI Pulse Pro application. The focus is on wiring components together, adding selection UI elements, and implementing bulk action handlers with proper error handling and user feedback.

## Tasks

- [x] 1. Integrate selection state management at App level
  - [x] 1.1 Import and initialize useBulkSelection hook in App.jsx
    - Import useBulkSelection from './hooks/useBulkSelection'
    - Initialize the hook in AppContent component
    - Extract selectedIds, toggleSelection, selectAll, clearSelection, isSelected methods
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 1.2 Pass selection state to child components
    - Pass selection methods and state to StoryCard components via props
    - Pass selection state to BulkActionsBar component
    - Ensure Selection_State persists across filter changes
    - _Requirements: 1.2, 1.3_
  
  - [x] 1.3 Clear selection on view navigation
    - Add useEffect to clear selection when currentView changes away from 'dashboard'
    - _Requirements: 1.4_

- [x] 2. Add individual article selection to StoryCard
  - [x] 2.1 Add checkbox UI to StoryCard component
    - Import Checkbox component from './components/ui/Checkbox'
    - Add checkbox in top-left corner with absolute positioning
    - Show checkbox on hover or when any article is selected
    - Add visual indicator (border or background) when article is selected
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 2.2 Implement checkbox click handler
    - Call toggleSelection with article ID on checkbox click
    - Prevent event propagation to avoid card expansion
    - Use isSelected to determine checkbox checked state
    - _Requirements: 2.2, 2.5_

- [x] 3. Add Select All functionality to dashboard header
  - [x] 3.1 Create Select All checkbox in FilterBar or dashboard header
    - Add "Select All" checkbox above the article list
    - Calculate indeterminate state (some but not all selected)
    - Show count of selected articles next to checkbox
    - _Requirements: 3.1, 3.4_
  
  - [x] 3.2 Implement Select All logic
    - Call selectAll with filtered article IDs when clicked with none selected
    - Call clearSelection when clicked with all selected
    - Only affect articles matching current filters
    - _Requirements: 3.2, 3.3, 3.5_

- [x] 4. Implement bulk content generation
  - [x] 4.1 Create bulk generate handler function
    - Create handleBulkGenerate async function in App.jsx
    - Accept array of selected article IDs
    - Call /api/generate endpoint for each article sequentially
    - Track progress and update loading state
    - _Requirements: 4.1, 4.5_
  
  - [x] 4.2 Add progress tracking and error handling
    - Display loading state with progress indicator (X of Y articles)
    - Collect errors for failed articles
    - Show success toast on completion
    - Show error toast with details of failed articles
    - Refresh article data after completion
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 5. Implement bulk scheduling
  - [x] 5.1 Create scheduling modal component
    - Create BulkScheduleModal component or reuse existing modal
    - Add platform selector (twitter, linkedin, etc.)
    - Add date/time picker for scheduling
    - Show count of articles being scheduled
    - _Requirements: 5.1, 5.2_
  
  - [x] 5.2 Create bulk schedule handler function
    - Create handleBulkSchedule async function in App.jsx
    - Call /api/schedule/queue endpoint for each article with platform and time
    - Display loading state during operation
    - Show success toast and clear selection on completion
    - Show error toast with details of failed articles
    - _Requirements: 5.3, 5.4, 5.5_

- [x] 6. Implement bulk tagging
  - [x] 6.1 Create tagging modal component
    - Create BulkTagModal component or reuse existing modal
    - Add text input for comma-separated tags
    - Show count of articles being tagged
    - Add validation for tag format
    - _Requirements: 6.1, 6.2_
  
  - [x] 6.2 Create bulk tag handler function
    - Create handleBulkTag async function in App.jsx
    - Call /api/tags/{article_id} endpoint for each article
    - Append new tags to existing tags without removing them
    - Display loading state during operation
    - Refresh article data and show success toast on completion
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 7. Implement bulk export
  - [x] 7.1 Create bulk export handler function
    - Create handleBulkExport async function in App.jsx
    - Call /api/export/batch endpoint with array of selected article IDs
    - Receive Markdown file blob from response
    - _Requirements: 7.1, 7.2_
  
  - [x] 7.2 Implement file download
    - Create blob URL from response
    - Trigger browser download with filename including timestamp and count
    - Format: `articles-export-${count}-${timestamp}.md`
    - Show success toast on completion
    - Show error toast if export fails
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 8. Implement bulk mark as posted
  - [x] 8.1 Create bulk mark posted handler function
    - Create handleBulkMarkPosted async function in App.jsx
    - Call /api/content/posted endpoint for each article
    - Mark articles as posted for all platforms with generated content
    - Display loading state with progress indicator
    - _Requirements: 8.1, 8.2, 8.4_
  
  - [x] 8.2 Add completion feedback
    - Refresh article data after completion
    - Show success toast with count of articles marked
    - Show error toast with details of failed articles
    - _Requirements: 8.3, 8.5_

- [x] 9. Implement bulk delete with confirmation
  - [x] 9.1 Create delete confirmation modal
    - Create BulkDeleteModal component or reuse existing modal
    - Display count of articles to be deleted
    - Add warning text: "This action is irreversible"
    - Add Cancel and Confirm buttons
    - _Requirements: 9.1, 9.2_
  
  - [x] 9.2 Create bulk delete handler function
    - Create handleBulkDelete async function in App.jsx
    - Call /api/articles/bulk-delete endpoint with array of article IDs
    - Display loading state during operation
    - Remove deleted articles from UI state
    - Clear selection after successful deletion
    - Show success toast with count of deleted articles
    - Show error toast if deletion fails
    - _Requirements: 9.3, 9.4, 9.5_

- [x] 10. Checkpoint - Test all bulk operations
  - Ensure all bulk operations work correctly
  - Verify error handling for partial failures
  - Test with various selection sizes
  - Ask the user if questions arise

- [x] 11. Integrate BulkActionsBar component
  - [x] 11.1 Add BulkActionsBar to App.jsx
    - Import BulkActionsBar component
    - Conditionally render when selectedIds.size > 0
    - Pass selectedCount prop
    - Pass all bulk action handler functions as props
    - Pass clearSelection as onClear prop
    - _Requirements: 11.1, 11.2, 11.3_
  
  - [x] 11.2 Verify BulkActionsBar positioning and visibility
    - Ensure bar is positioned at bottom center as floating element
    - Verify bar remains visible when scrolling
    - Test z-index to ensure bar appears above other content
    - _Requirements: 11.4, 11.5_

- [x] 12. Implement keyboard shortcuts
  - [x] 12.1 Add keyboard event listener in App.jsx
    - Add useEffect with keyboard event listener
    - Listen for Ctrl+A (Cmd+A on Mac) to select all visible articles
    - Listen for Escape to clear selection
    - Listen for Delete to trigger bulk delete confirmation
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 12.2 Add keyboard shortcut guards
    - Only respond to shortcuts when currentView === 'dashboard'
    - Disable shortcuts when any modal is open
    - Prevent default browser behavior for Ctrl+A
    - _Requirements: 12.4, 12.5_

- [x] 13. Implement comprehensive loading and error states
  - [x] 13.1 Create loading state UI components
    - Add loading overlay or progress bar for bulk operations
    - Show operation name and progress (X of Y articles)
    - Disable other actions while operation is in progress
    - _Requirements: 10.1, 10.2_
  
  - [x] 13.2 Create error state UI components
    - Show error toast with specific error messages
    - List which articles failed and why
    - Add "Retry" option for failed operations
    - Add "Dismiss" option to close error message
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 14. Final checkpoint and integration testing
  - Ensure all tests pass
  - Verify keyboard shortcuts work correctly
  - Test all bulk operations with edge cases (empty selection, single item, all items)
  - Verify loading states and error handling
  - Test on different screen sizes for responsive behavior
  - Ask the user if questions arise

## Notes

- All bulk action handlers should follow a consistent pattern: loading state → API calls → error handling → success feedback
- The useBulkSelection hook and BulkActionsBar component are already implemented and tested
- Backend API endpoints exist except possibly /api/articles/bulk-delete (verify and create if needed)
- Error handling should be robust since bulk operations can partially fail
- Progress indication is critical for user experience during long-running operations
- Selection state should be cleared after successful bulk operations (except export and mark posted)
