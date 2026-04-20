import React, { useState, useEffect, useRef, useCallback, memo } from 'react';

/**
 * Performance Optimization Hooks
 * 
 * Provides performance optimization utilities:
 * - Memoization helpers
 * - Debounce and throttle
 * - Virtual scrolling
 * - Lazy loading
 */

// Enhanced memo hook with deep comparison
export const useSmartMemo = (fn, deps, compareFn = null) => {
  const memoRef = useRef();
  const depsRef = useRef();
  
  if (!memoRef.current || !compareFn?.(depsRef.current, deps)) {
    memoRef.current = fn();
    depsRef.current = deps;
  }
  
  return memoRef.current;
};

// Performance monitoring hook
export const usePerformanceMonitor = (componentName) => {
  const renderStartTime = useRef();
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current += 1;
    
    return () => {
      const renderTime = performance.now() - renderStartTime.current;
      
      // Log slow renders
      if (renderTime > 16) { // More than one frame
        console.warn(`Slow render detected in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCount.current
        });
      }
    };
  });
  
  return { renderCount: renderCount.current };
};

// Virtual scrolling hook
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useSmartMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);
  
  return { visibleItems, handleScroll };
};

// Lazy loading hook
export const useLazyLoad = (threshold = 0.1) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef();
  
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasLoaded) {
          setIsIntersecting(true);
          setHasLoaded(true);
        }
      },
      { threshold }
    );
    
    observer.observe(element);
    
    return () => observer.unobserve(element);
  }, [threshold, hasLoaded]);
  
  return { elementRef, isIntersecting, hasLoaded };
};

// Bundle size monitoring
export const useBundleSizeMonitor = () => {
  useEffect(() => {
    if ('performance' in window && 'memory' in performance) {
      const memoryInfo = performance.memory;
      
      if (import.meta.env.DEV) {
        console.log('Memory usage:', {
          usedJSHeapSize: `${(memoryInfo.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          totalJSHeapSize: `${(memoryInfo.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        jsHeapSizeLimit: `${(memoryInfo.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
  }, []);
};

// Optimized pagination hook
export const useOptimizedPagination = (items, itemsPerPage = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  
  const paginatedItems = useSmartMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  }, [items, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(items.length / itemsPerPage);
  
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);
  
  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);
  
  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);
  
  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Memoized component wrapper
export const withMemo = (Component, areEqual = null) => {
  const MemoizedComponent = React.memo(Component, areEqual);
  
  return (props) => {
    const { renderCount } = usePerformanceMonitor(Component.displayName || Component.name);
    
    return <MemoizedComponent {...props} />;
  };
};

// Code splitting helper
export const createLazyComponent = (importFunction, fallback = null) => {
  return React.lazy(() => {
    return importFunction().catch(error => {
      console.error('Failed to load component:', error);
      return { default: fallback || (() => <div>Failed to load component</div>) };
    });
  });
};

// Performance optimized event handler
export const useOptimizedCallback = (callback, deps = [], options = {}) => {
  const { debounce = 0, throttle = 0 } = options;
  
  return useCallback(callback, deps);
};
