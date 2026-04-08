import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Accessibility Hooks and Utilities
 * 
 * Provides comprehensive accessibility functionality:
 * - Keyboard navigation
 * - Focus management
 * - Screen reader support
 * - ARIA attributes management
 * - High contrast mode detection
 */

// Keyboard navigation hook
export const useKeyboardNavigation = (options = {}) => {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onSpace,
    onTab,
    enabled = true
  } = options;

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    switch (event.key) {
      case 'Enter':
        onEnter?.(event);
        break;
      case 'Escape':
        onEscape?.(event);
        break;
      case 'ArrowUp':
        onArrowUp?.(event);
        break;
      case 'ArrowDown':
        onArrowDown?.(event);
        break;
      case 'ArrowLeft':
        onArrowLeft?.(event);
        break;
      case 'ArrowRight':
        onArrowRight?.(event);
        break;
      case ' ':
        onSpace?.(event);
        break;
      case 'Tab':
        onTab?.(event);
        break;
    }
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onSpace, onTab]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return { handleKeyDown };
};

// Focus management hook
export const useFocusManagement = (initialFocusRef = null) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusableElementsRef = useRef([]);
  const containerRef = useRef(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button',
      '[href]',
      'input',
      'select',
      'textarea',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ');
    
    return Array.from(containerRef.current.querySelectorAll(selector))
      .filter(el => !el.disabled && !el.getAttribute('aria-hidden'));
  }, []);

  const focusElement = useCallback((index) => {
    const elements = getFocusableElements();
    if (elements[index]) {
      elements[index].focus();
      setFocusedIndex(index);
    }
  }, [getFocusableElements]);

  const focusFirst = useCallback(() => {
    focusElement(0);
  }, [focusElement]);

  const focusLast = useCallback(() => {
    const elements = getFocusableElements();
    focusElement(elements.length - 1);
  }, [focusElement]);

  const focusNext = useCallback(() => {
    const elements = getFocusableElements();
    const nextIndex = (focusedIndex + 1) % elements.length;
    focusElement(nextIndex);
  }, [focusedIndex, focusElement, getFocusableElements]);

  const focusPrevious = useCallback(() => {
    const elements = getFocusableElements();
    const prevIndex = focusedIndex === 0 ? elements.length - 1 : focusedIndex - 1;
    focusElement(prevIndex);
  }, [focusedIndex, focusElement, getFocusableElements]);

  const trapFocus = useCallback((event) => {
    if (!containerRef.current) return;

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

  useEffect(() => {
    if (initialFocusRef && initialFocusRef.current) {
      initialFocusRef.current.focus();
    }
  }, [initialFocusRef]);

  return {
    containerRef,
    focusedIndex,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,
    focusElement,
    trapFocus,
    getFocusableElements
  };
};

// ARIA attributes management hook
export const useAriaAttributes = (initialAttributes = {}) => {
  const [attributes, setAttributes] = useState(initialAttributes);

  const updateAttribute = useCallback((key, value) => {
    setAttributes(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateAttributes = useCallback((newAttributes) => {
    setAttributes(prev => ({
      ...prev,
      ...newAttributes
    }));
  }, []);

  const removeAttribute = useCallback((key) => {
    setAttributes(prev => {
      const { [key]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    attributes,
    updateAttribute,
    updateAttributes,
    removeAttribute
  };
};

// Screen reader announcement hook
export const useScreenReader = () => {
  const announcementRef = useRef(null);

  const announce = useCallback((message, priority = 'polite') => {
    if (!announcementRef.current) {
      announcementRef.current = document.createElement('div');
      announcementRef.current.setAttribute('aria-live', priority);
      announcementRef.current.setAttribute('aria-atomic', 'true');
      announcementRef.current.style.position = 'absolute';
      announcementRef.current.style.left = '-10000px';
      announcementRef.current.style.width = '1px';
      announcementRef.current.style.height = '1px';
      announcementRef.current.style.overflow = 'hidden';
      document.body.appendChild(announcementRef.current);
    }

    announcementRef.current.textContent = message;
    
    // Clear the announcement after a delay
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  const announcePolite = useCallback((message) => {
    announce(message, 'polite');
  }, [announce]);

  const announceAssertive = useCallback((message) => {
    announce(message, 'assertive');
  }, [announce]);

  return {
    announce,
    announcePolite,
    announceAssertive
  };
};

// High contrast mode detection hook
export const useHighContrastMode = () => {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const msHighContrast = window.matchMedia('(ms-high-contrast: active)').matches;
      
      // Check for prefers-contrast: high
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      setIsHighContrast(msHighContrast || prefersHighContrast);
    };

    checkHighContrast();

    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    if (mediaQuery.addListener) {
      mediaQuery.addListener(checkHighContrast);
      return () => mediaQuery.removeListener(checkHighContrast);
    } else if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkHighContrast);
      return () => mediaQuery.removeEventListener('change', checkHighContrast);
    }
  }, []);

  return isHighContrast;
};

// Reduced motion detection hook
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    
    if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    } else if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return prefersReducedMotion;
};

// Skip link component
export const SkipLink = ({ href, children, className = '' }) => {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50 ${className}`}
    >
      {children}
    </a>
  );
};

// Accessible button component
export const AccessibleButton = ({ 
  children, 
  onClick, 
  disabled = false, 
  ariaLabel, 
  ariaDescribedBy,
  className = '',
  ...props 
}) => {
  const { announce } = useScreenReader();

  const handleClick = useCallback((event) => {
    if (disabled) return;
    
    onClick?.(event);
    
    // Announce button action to screen readers
    if (ariaLabel) {
      announce(`${ariaLabel} activated`);
    }
  }, [disabled, onClick, ariaLabel, announce]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Accessible modal hook
export const useAccessibleModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { focusFirst, focusLast, trapFocus, containerRef } = useFocusManagement();
  const { announce } = useScreenReader();

  const openModal = useCallback(() => {
    setIsOpen(true);
    // Focus first element when modal opens
    setTimeout(() => {
      focusFirst();
      announce('Modal opened');
    }, 100);
  }, [focusFirst, announce]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    announce('Modal closed');
  }, [announce]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', trapFocus);
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', trapFocus);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, trapFocus]);

  return {
    isOpen,
    openModal,
    closeModal,
    containerRef
  };
};

// Accessible form validation hook
export const useAccessibleForm = () => {
  const [errors, setErrors] = useState({});
  const { announce } = useScreenReader();

  const validateField = useCallback((name, value, rules) => {
    const fieldErrors = [];
    
    if (rules.required && !value) {
      fieldErrors.push(`${name} is required`);
    }
    
    if (rules.minLength && value.length < rules.minLength) {
      fieldErrors.push(`${name} must be at least ${rules.minLength} characters`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      fieldErrors.push(`${name} format is invalid`);
    }
    
    setErrors(prev => ({
      ...prev,
      [name]: fieldErrors
    }));
    
    if (fieldErrors.length > 0) {
      announce(`${name} has errors: ${fieldErrors.join(', ')}`);
    }
    
    return fieldErrors.length === 0;
  }, [announce]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const hasErrors = Object.keys(errors).some(key => errors[key].length > 0);

  return {
    errors,
    validateField,
    clearErrors,
    hasErrors
  };
};
