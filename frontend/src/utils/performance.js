import React, { memo, useMemo, useCallback, useEffect, useRef, useState } from 'react';

/**
 * Performance Optimization Utilities
 * 
 * Provides various performance optimization patterns:
 * - Memoization helpers
 * - Debounce and throttle utilities
 * - Virtual scrolling helpers
 * - Lazy loading utilities
 * - Performance monitoring
 */

// Enhanced memo with custom comparison
export const smartMemo = (Component, areEqual = null) => {
  return memo(Component, areEqual);
};

// Deep comparison utility for memo
export const deepEqual = (prevProps, nextProps) => {
  if (prevProps === nextProps) return true;
  
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  for (const key of prevKeys) {
    if (!nextKeys.includes(key)) return false;
    
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];
    
    if (prevValue === nextValue) continue;
    
    if (typeof prevValue !== typeof nextValue) return false;
    
    if (typeof prevValue === 'object' && prevValue !== null) {
      if (!deepEqual(prevValue, nextValue)) return false;
    } else {
      return false;
    }
  }
  
  return true;
};

// Shallow comparison for specific keys
export const shallowEqualKeys = (keys) => (prevProps, nextProps) => {
  return keys.every(key => prevProps[key] === nextProps[key]);
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
  
  const measureOperation = useCallback((operationName, operation) => {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    
    console.log(`${componentName} - ${operationName}:`, `${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }, [componentName]);
  
  return { measureOperation, renderCount: renderCount.current };
};

// Virtual scrolling hook
export const useVirtualScroll = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleItems = useMemo(() => {
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

// Image lazy loading component
export const LazyImage = memo(({ src, alt, placeholder, className, ...props }) => {
  const { elementRef, isIntersecting, hasLoaded } = useLazyLoad();
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    if (isIntersecting && !hasLoaded && src) {
      const img = new Image();
      
      img.onload = () => {
        setImageSrc(src);
        setHasLoaded(true);
      };
      
      img.onerror = () => {
        setHasError(true);
      };
      
      img.src = src;
    }
  }, [isIntersecting, hasLoaded, src]);
  
  return (
    <img
      ref={elementRef}
      src={imageSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
});

// Code splitting helper
export const lazyLoadComponent = (importFunction, fallback = null) => {
  return React.lazy(() => {
    return importFunction().catch(error => {
      console.error('Failed to load component:', error);
      return { default: fallback || (() => <div>Failed to load component</div>) };
    });
  });
};

// Bundle size monitoring
export const useBundleSizeMonitor = () => {
  useEffect(() => {
    if ('performance' in window && 'memory' in performance) {
      const memoryInfo = performance.memory;
      
      console.log('Memory usage:', {
        usedJSHeapSize: `${(memoryInfo.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        totalJSHeapSize: `${(memoryInfo.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        jsHeapSizeLimit: `${(memoryInfo.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
    
    // Monitor bundle load time
    if ('navigation' in performance) {
      const navigation = performance.getEntriesByType('navigation')[0];
      
      console.log('Page load performance:', {
        domContentLoaded: `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
        loadComplete: `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
        totalTime: `${navigation.loadEventEnd - navigation.fetchStart}ms`
      });
    }
  }, []);
};

// Debounced value hook
export const useDebouncedValue = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Throttled function hook
export const useThrottledFunction = (callback, delay) => {
  const lastCall = useRef(0);
  
  return useCallback((...args) => {
    const now = Date.now();
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      return callback(...args);
    }
  }, [callback, delay]);
};

// Performance-optimized event handler
export const useOptimizedEventHandler = (handler, options = {}) => {
  const {
    debounce = 0,
    throttle = 0,
    leading = false,
    trailing = true
  } = options;
  
  const debouncedHandler = useDebouncedValue(handler, debounce);
  const throttledHandler = useThrottledFunction(handler, throttle);
  
  if (debounce > 0) return debouncedHandler;
  if (throttle > 0) return throttledHandler;
  
  return handler;
};

// Component performance profiler
export const withPerformanceProfiler = (WrappedComponent, componentName) => {
  return memo((props) => {
    const { measureOperation } = usePerformanceMonitor(componentName);
    
    return measureOperation('render', () => (
      <WrappedComponent {...props} />
    ));
  });
};

// Optimized list component
export const VirtualizedList = memo(({ 
  items, 
  itemHeight, 
  containerHeight, 
  renderItem, 
  className 
}) => {
  const { visibleItems, handleScroll } = useVirtualScroll(
    items, 
    itemHeight, 
    containerHeight
  );
  
  return (
    <div
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${visibleItems.offsetY}px)` }}>
          {visibleItems.items.map((item, index) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, visibleItems.startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default {
  smartMemo,
  deepEqual,
  shallowEqualKeys,
  usePerformanceMonitor,
  useVirtualScroll,
  useLazyLoad,
  LazyImage,
  lazyLoadComponent,
  useBundleSizeMonitor,
  useDebouncedValue,
  useThrottledFunction,
  useOptimizedEventHandler,
  withPerformanceProfiler,
  VirtualizedList
};
