import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

/**
 * Tabs Component - Design System
 * 
 * A tabs component with keyboard navigation and compound component pattern.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Features:
 * - Compound component pattern (Tabs, Tabs.List, Tabs.Trigger, Tabs.Content)
 * - Both controlled (value + onValueChange) and uncontrolled (defaultValue) modes
 * - Keyboard navigation (Arrow keys, Home, End)
 * - ARIA compliant (role="tablist", role="tab", role="tabpanel", aria-selected)
 * - Smooth transitions between tabs
 * - Disabled state for tabs
 * 
 * @example
 * // Uncontrolled mode
 * <Tabs defaultValue="overview">
 *   <Tabs.List>
 *     <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *     <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="overview">Overview content</Tabs.Content>
 *   <Tabs.Content value="analytics">Analytics content</Tabs.Content>
 * </Tabs>
 * 
 * @example
 * // Controlled mode
 * const [activeTab, setActiveTab] = useState('overview');
 * <Tabs value={activeTab} onValueChange={setActiveTab}>
 *   <Tabs.List>
 *     <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 *     <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
 *   </Tabs.List>
 *   <Tabs.Content value="overview">Overview content</Tabs.Content>
 *   <Tabs.Content value="analytics">Analytics content</Tabs.Content>
 * </Tabs>
 */

// Context for sharing state between Tabs components
const TabsContext = createContext(null);

const Tabs = ({
  defaultValue,
  value,
  onValueChange,
  children,
  className = '',
}) => {
  // Determine if controlled or uncontrolled
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const currentValue = isControlled ? value : internalValue;

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    if (isControlled && !onValueChange) {
      console.warn(
        'Tabs component is controlled (value prop provided) but no onValueChange handler was provided. ' +
        'This will result in a read-only tabs component.'
      );
    }
    if (!isControlled && !defaultValue) {
      console.warn(
        'Tabs component is uncontrolled but no defaultValue was provided. ' +
        'The first tab will not be selected by default.'
      );
    }
  }

  /**
   * Handle tab change
   */
  const handleValueChange = (newValue) => {
    if (isControlled) {
      onValueChange?.(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  return (
    <TabsContext.Provider
      value={{
        currentValue,
        onValueChange: handleValueChange,
      }}
    >
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * Tabs.List Component
 * 
 * Container for tab triggers.
 * 
 * @example
 * <Tabs.List>
 *   <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
 *   <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
 * </Tabs.List>
 */
const TabsList = ({
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);
  const listRef = useRef(null);
  const triggerRefs = useRef([]);

  if (!context) {
    throw new Error('Tabs.List must be used within a Tabs component');
  }

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    const triggers = triggerRefs.current.filter((trigger) => trigger && !trigger.hasAttribute('data-disabled'));
    const currentIndex = triggers.findIndex((trigger) => trigger === document.activeElement);

    if (currentIndex === -1) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (triggers.length > 0) {
          const nextIndex = currentIndex < triggers.length - 1 ? currentIndex + 1 : 0;
          triggers[nextIndex]?.focus();
          triggers[nextIndex]?.click();
        }
        break;

      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (triggers.length > 0) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : triggers.length - 1;
          triggers[prevIndex]?.focus();
          triggers[prevIndex]?.click();
        }
        break;

      case 'Home':
        e.preventDefault();
        if (triggers.length > 0) {
          triggers[0]?.focus();
          triggers[0]?.click();
        }
        break;

      case 'End':
        e.preventDefault();
        if (triggers.length > 0) {
          triggers[triggers.length - 1]?.focus();
          triggers[triggers.length - 1]?.click();
        }
        break;

      default:
        break;
    }
  };

  // List styles using theme tokens
  const listBaseStyles = 'flex gap-1 border-b';
  const listColorStyles = 'border-[var(--color-border)]';

  return (
    <TabsContext.Provider value={{ ...context, triggerRefs }}>
      <div
        ref={listRef}
        role="tablist"
        className={`${listBaseStyles} ${listColorStyles} ${className}`}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

/**
 * Tabs.Trigger Component
 * 
 * Individual tab trigger button.
 * 
 * @example
 * <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
 * <Tabs.Trigger value="settings" disabled>Settings</Tabs.Trigger>
 */
const TabsTrigger = ({
  value,
  children,
  disabled = false,
  className = '',
}) => {
  const context = useContext(TabsContext);
  const triggerRef = useRef(null);

  if (!context) {
    throw new Error('Tabs.Trigger must be used within a Tabs.List component');
  }

  const { currentValue, onValueChange, triggerRefs } = context;
  const isSelected = currentValue === value;

  // Register trigger ref
  useEffect(() => {
    if (triggerRef.current && triggerRefs) {
      triggerRefs.current.push(triggerRef.current);
    }
    return () => {
      if (triggerRefs) {
        const index = triggerRefs.current.indexOf(triggerRef.current);
        if (index > -1) {
          triggerRefs.current.splice(index, 1);
        }
      }
    };
  }, [triggerRefs]);

  /**
   * Handle trigger click
   */
  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };

  // Trigger styles using theme tokens
  const triggerBaseStyles = 'px-4 py-2 text-sm font-medium transition-colors duration-200 border-b-2 focus:outline-none';
  const triggerColorStyles = isSelected
    ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
    : disabled
    ? 'text-[var(--color-text-secondary)] border-transparent cursor-not-allowed opacity-50'
    : 'text-[var(--color-text-secondary)] border-transparent hover:text-[var(--color-text-primary)] hover:border-[var(--color-border)] cursor-pointer';

  return (
    <button
      ref={triggerRef}
      role="tab"
      type="button"
      disabled={disabled}
      data-disabled={disabled ? 'true' : undefined}
      aria-selected={isSelected}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      tabIndex={isSelected ? 0 : -1}
      onClick={handleClick}
      className={`${triggerBaseStyles} ${triggerColorStyles} ${className}`}
    >
      {children}
    </button>
  );
};

/**
 * Tabs.Content Component
 * 
 * Content panel for a tab.
 * 
 * @example
 * <Tabs.Content value="overview">
 *   <p>Overview content goes here</p>
 * </Tabs.Content>
 */
const TabsContent = ({
  value,
  children,
  className = '',
}) => {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error('Tabs.Content must be used within a Tabs component');
  }

  const { currentValue } = context;
  const isSelected = currentValue === value;

  if (!isSelected) {
    return null;
  }

  // Content styles with smooth transition
  const contentBaseStyles = 'pt-4 focus:outline-none animate-fadeIn';
  const contentColorStyles = 'text-[var(--color-text-primary)]';

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={`${contentBaseStyles} ${contentColorStyles} ${className}`}
    >
      {children}
    </div>
  );
};

// Attach sub-components as static properties
Tabs.List = TabsList;
Tabs.Trigger = TabsTrigger;
Tabs.Content = TabsContent;

Tabs.displayName = 'Tabs';
TabsList.displayName = 'Tabs.List';
TabsTrigger.displayName = 'Tabs.Trigger';
TabsContent.displayName = 'Tabs.Content';

export default Tabs;
