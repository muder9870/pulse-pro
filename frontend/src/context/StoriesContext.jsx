import React, { createContext, useContext } from 'react';

/**
 * StoriesContext - Context for stories data and UI state
 * 
 * Reduces prop drilling by providing stories data, filters, and selection state
 * to deeply nested components without passing through intermediate layers.
 * Created as part of T10 refactoring.
 */
const StoriesContext = createContext(null);

export function StoriesProvider({ children, value }) {
  return (
    <StoriesContext.Provider value={value}>
      {children}
    </StoriesContext.Provider>
  );
}

export function useStories() {
  const context = useContext(StoriesContext);
  if (!context) {
    throw new Error('useStories must be used within StoriesProvider');
  }
  return context;
}

export default StoriesContext;
