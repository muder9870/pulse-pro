import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip Component - Design System
 * 
 * A tooltip that displays additional information on hover or focus.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Features:
 * - Configurable positioning (top, bottom, left, right)
 * - Configurable hover delay
 * - Keyboard accessible (shows on focus, hides on Escape)
 * - ARIA compliant (role="tooltip", aria-describedby)
 * - Smooth fade-in/fade-out animations
 * 
 * Positions:
 * - top: Tooltip appears above the trigger element (default)
 * - bottom: Tooltip appears below the trigger element
 * - left: Tooltip appears to the left of the trigger element
 * - right: Tooltip appears to the right of the trigger element
 * 
 * @example
 * <Tooltip content="Delete item" position="top">
 *   <Button variant="danger">Delete</Button>
 * </Tooltip>
 * 
 * @example
 * <Tooltip content="This action cannot be undone" position="bottom" delay={500}>
 *   <Button>Confirm</Button>
 * </Tooltip>
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const timeoutRef = useRef(null);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).substr(2, 9)}`);

  // Validate position prop in development
  const validPositions = ['top', 'bottom', 'left', 'right'];
  if (process.env.NODE_ENV === 'development' && !validPositions.includes(position)) {
    console.warn(
      `Invalid position "${position}" provided to Tooltip. ` +
      `Valid positions are: ${validPositions.join(', ')}. ` +
      `Falling back to "top" position.`
    );
  }

  const safePosition = validPositions.includes(position) ? position : 'top';

  /**
   * Calculate tooltip position based on trigger element and position prop
   */
  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8; // Gap between trigger and tooltip

    let top = 0;
    let left = 0;

    switch (safePosition) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + spacing;
        break;
      default:
        break;
    }

    // Keep tooltip within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < spacing) {
      left = spacing;
    } else if (left + tooltipRect.width > viewportWidth - spacing) {
      left = viewportWidth - tooltipRect.width - spacing;
    }

    if (top < spacing) {
      top = spacing;
    } else if (top + tooltipRect.height > viewportHeight - spacing) {
      top = viewportHeight - tooltipRect.height - spacing;
    }

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    });
  };

  /**
   * Show tooltip after delay
   */
  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  /**
   * Hide tooltip immediately
   */
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  /**
   * Handle keyboard events
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      hideTooltip();
    }
  };

  /**
   * Update tooltip position when visible
   */
  useEffect(() => {
    if (isVisible) {
      calculatePosition();

      // Recalculate on scroll or resize
      const handleUpdate = () => calculatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isVisible, safePosition]);

  /**
   * Cleanup timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Base tooltip styles using theme tokens
  const tooltipBaseStyles = 'px-3 py-2 text-sm rounded-md shadow-lg pointer-events-none transition-opacity duration-200';
  const tooltipColorStyles = 'bg-[var(--color-text-primary)] text-[var(--color-background)] border border-[var(--color-border)]';
  const tooltipVisibilityStyles = isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none';

  // Arrow styles based on position
  const arrowBaseStyles = 'absolute w-2 h-2 transform rotate-45';
  const arrowColorStyles = 'bg-[var(--color-text-primary)] border-[var(--color-border)]';
  
  const arrowPositionStyles = {
    top: 'bottom-[-5px] left-1/2 -translate-x-1/2 border-b border-r',
    bottom: 'top-[-5px] left-1/2 -translate-x-1/2 border-t border-l',
    left: 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t',
    right: 'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b',
  };

  /**
   * Handle click/tap for mobile devices
   */
  const handleClick = (e) => {
    // Toggle tooltip on click (for mobile where hover doesn't work)
    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
    }
    trigger.props.onClick?.(e);
  };

  // Clone children to add event handlers and ARIA attributes
  const trigger = React.Children.only(children);
  const triggerWithProps = React.cloneElement(trigger, {
    ref: triggerRef,
    onMouseEnter: (e) => {
      showTooltip();
      trigger.props.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      hideTooltip();
      trigger.props.onMouseLeave?.(e);
    },
    onFocus: (e) => {
      showTooltip();
      trigger.props.onFocus?.(e);
    },
    onBlur: (e) => {
      hideTooltip();
      trigger.props.onBlur?.(e);
    },
    onClick: handleClick,
    onKeyDown: (e) => {
      handleKeyDown(e);
      trigger.props.onKeyDown?.(e);
    },
    'aria-describedby': isVisible ? tooltipId.current : undefined,
  });

  return (
    <>
      {triggerWithProps}
      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          style={tooltipStyle}
          className={`${tooltipBaseStyles} ${tooltipColorStyles} ${tooltipVisibilityStyles} ${className}`}
        >
          {content}
          <div
            className={`${arrowBaseStyles} ${arrowColorStyles} ${arrowPositionStyles[safePosition]}`}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
};

Tooltip.displayName = 'Tooltip';

export default Tooltip;
