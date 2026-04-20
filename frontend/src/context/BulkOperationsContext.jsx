import React, { createContext, useContext } from 'react';

/**
 * BulkOperationsContext - Context for bulk operation state and handlers
 * 
 * Reduces prop drilling by providing bulk operation functionality
 * to deeply nested components without passing through intermediate layers.
 * Created as part of T10 refactoring.
 */
const BulkOperationsContext = createContext(null);

export function BulkOperationsProvider({ children, value }) {
  return (
    <BulkOperationsContext.Provider value={value}>
      {children}
    </BulkOperationsContext.Provider>
  );
}

export function useBulkOperations() {
  const context = useContext(BulkOperationsContext);
  if (!context) {
    throw new Error('useBulkOperations must be used within BulkOperationsProvider');
  }
  return context;
}

export default BulkOperationsContext;
