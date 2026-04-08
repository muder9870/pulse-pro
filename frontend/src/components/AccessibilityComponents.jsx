import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Accessibility Components
 * 
 * Provides accessible UI components with proper ARIA support,
 * keyboard navigation, and screen reader compatibility.
 */

// Skip Link Component
export const SkipLink = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    >
      {children}
    </a>
  );
};

// Accessible Button Component
export const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  ariaLabel, 
  ariaDescribedBy,
  className = '',
  loading = false,
  ...props 
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = useCallback((event) => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 200);
    
    onClick?.(event);
  }, [disabled, loading, onClick]);

  const handleKeyDown = useCallback((event) => {
    if (disabled || loading) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick(event);
    }
  }, [disabled, loading, handleClick]);

  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      className={`
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isPressed ? 'scale-95' : ''}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="sr-only">Loading</span>
      )}
      {children}
    </button>
  );
};

// Accessible Input Component
export const AccessibleInput = ({ 
  label, 
  error, 
  helperText, 
  required = false, 
  className = '',
  ...props 
}) => {
  const inputRef = useRef(null);
  const [hasError, setHasError] = useState(!!error);

  useEffect(() => {
    setHasError(!!error);
  }, [error]);

  const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = hasError ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <input
        ref={inputRef}
        id={inputId}
        aria-invalid={hasError}
        aria-describedby={[
          errorId,
          helperId
        ].filter(Boolean).join(' ')}
        aria-required={required}
        className={`
          w-full px-3 py-2 border rounded-md text-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          ${hasError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      
      {helperText && !hasError && (
        <p id={helperId} className="text-xs text-gray-500">
          {helperText}
        </p>
      )}
      
      {hasError && (
        <p id={errorId} className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

// Accessible Modal Component
export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  className = '' 
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  // Focus management
  const getFocusableElements = useCallback(() => {
    if (!modalRef.current) return [];
    
    const selector = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(modalRef.current.querySelectorAll(selector))
      .filter(el => !el.disabled && !el.getAttribute('aria-hidden'));
  }, []);

  const trapFocus = useCallback((event) => {
    if (!modalRef.current) return;

    const elements = getFocusableElements();
    if (elements.length === 0) return;

    const firstElement = elements[0];
    const lastElement = elements[elements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [getFocusableElements]);

  // Handle escape key
  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Focus management on open/close
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      
      // Focus first element after animation
      setTimeout(() => {
        const elements = getFocusableElements();
        if (elements.length > 0) {
          elements[0].focus();
        }
      }, 100);
      
      // Add event listeners
      document.addEventListener('keydown', trapFocus);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('keydown', trapFocus);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'unset';
      };
    } else {
      // Restore focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, trapFocus, handleKeyDown, getFocusableElements]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div
          ref={modalRef}
          className={`
            relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6
            focus:outline-none
            ${className}
          `}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between mb-4">
              <h2 id="modal-title" className="text-xl font-semibold">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1"
                aria-label="Close modal"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Content */}
          <div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

// Accessible List Component
export const AccessibleList = ({ 
  items, 
  renderItem, 
  ariaLabel, 
  orientation = 'vertical',
  className = '' 
}) => {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const listRef = useRef(null);

  const handleKeyDown = useCallback((event) => {
    const maxIndex = items.length - 1;
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        setFocusedIndex(prev => prev < maxIndex ? prev + 1 : 0);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : maxIndex);
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(maxIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0) {
          // Trigger item action
          const item = items[focusedIndex];
          if (item.onClick) {
            item.onClick();
          }
        }
        break;
      case 'Escape':
        setFocusedIndex(-1);
        break;
    }
  }, [items.length, focusedIndex]);

  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      if (items[focusedIndex]) {
        items[focusedIndex].focus();
      }
    }
  }, [focusedIndex]);

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
      className={className}
      tabIndex={0}
    >
      {items.map((item, index) => (
        <div
          key={item.id || index}
          role="option"
          aria-selected={focusedIndex === index}
          tabIndex={-1}
          className={`
            cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500
            ${focusedIndex === index ? 'bg-blue-100' : ''}
          `}
          onClick={() => {
            setFocusedIndex(index);
            if (item.onClick) {
              item.onClick();
            }
          }}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
};

// Accessible Tooltip Component
export const AccessibleTooltip = ({ 
  children, 
  content, 
  placement = 'top' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-10 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg
            ${placement === 'top' ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' : ''}
            ${placement === 'bottom' ? 'top-full mt-2 left-1/2 transform -translate-x-1/2' : ''}
            ${placement === 'left' ? 'right-full mr-2 top-1/2 transform -translate-y-1/2' : ''}
            ${placement === 'right' ? 'left-full ml-2 top-1/2 transform -translate-y-1/2' : ''}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

// Accessible Progress Bar Component
export const AccessibleProgressBar = ({ 
  value, 
  max = 100, 
  label, 
  showValue = true 
}) => {
  const percentage = Math.round((value / max) * 100);
  const progressId = `progress-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={progressId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
          {showValue && (
            <span className="text-sm text-gray-500">{percentage}%</span>
          )}
        </div>
      )}
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          id={progressId}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={label ? `${label}: ${percentage}%` : `${percentage}%`}
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
