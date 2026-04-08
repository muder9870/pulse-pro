import React, { useState, useRef, useEffect, createContext, useContext } from 'react';

/**
 * Dropdown Component - Design System
 * 
 * A dropdown menu component with keyboard navigation and compound component pattern.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Features:
 * - Compound component pattern (Dropdown, Dropdown.Item)
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Configurable alignment (start, center, end)
 * - ARIA compliant (role="menu", role="menuitem", aria-expanded)
 * - Support for icons in menu items
 * - Disabled state for items
 * - Click outside to close
 * - Focus management
 * 
 * @example
 * <Dropdown trigger={<Button>Actions</Button>}>
 *   <Dropdown.Item icon={Edit} onSelect={handleEdit}>Edit</Dropdown.Item>
 *   <Dropdown.Item icon={Trash} onSelect={handleDelete}>Delete</Dropdown.Item>
 * </Dropdown>
 * 
 * @example
 * <Dropdown trigger={<Button>Options</Button>} align="end">
 *   <Dropdown.Item onSelect={handleSave}>Save</Dropdown.Item>
 *   <Dropdown.Item disabled>Export (Coming Soon)</Dropdown.Item>
 * </Dropdown>
 */

// Context for sharing state between Dropdown and Dropdown.Item
const DropdownContext = createContext(null);

const Dropdown = ({
  trigger,
  children,
  align = 'start',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useRef(`dropdown-menu-${Math.random().toString(36).substr(2, 9)}`);

  // Validate align prop in development
  const validAlignments = ['start', 'center', 'end'];
  if (process.env.NODE_ENV === 'development' && !validAlignments.includes(align)) {
    console.warn(
      `Invalid align "${align}" provided to Dropdown. ` +
      `Valid alignments are: ${validAlignments.join(', ')}. ` +
      `Falling back to "start" alignment.`
    );
  }

  const safeAlign = validAlignments.includes(align) ? align : 'start';

  /**
   * Calculate menu position based on trigger element and align prop
   */
  const calculatePosition = () => {
    if (!triggerRef.current || !menuRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const spacing = 4; // Gap between trigger and menu

    let top = triggerRect.bottom + spacing;
    let left = 0;

    switch (safeAlign) {
      case 'start':
        left = triggerRect.left;
        break;
      case 'center':
        left = triggerRect.left + (triggerRect.width - menuRect.width) / 2;
        break;
      case 'end':
        left = triggerRect.right - menuRect.width;
        break;
      default:
        break;
    }

    // Keep menu within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < spacing) {
      left = spacing;
    } else if (left + menuRect.width > viewportWidth - spacing) {
      left = viewportWidth - menuRect.width - spacing;
    }

    // If menu would go below viewport, show it above the trigger
    if (top + menuRect.height > viewportHeight - spacing) {
      top = triggerRect.top - menuRect.height - spacing;
    }

    setMenuStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    });
  };

  /**
   * Toggle dropdown open/closed
   */
  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(0); // Focus first item when opening
    }
  };

  /**
   * Close dropdown
   */
  const closeDropdown = () => {
    setIsOpen(false);
    setFocusedIndex(-1);
    // Return focus to trigger
    if (triggerRef.current) {
      triggerRef.current.focus();
    }
  };

  /**
   * Handle item selection
   */
  const handleItemSelect = (onSelect) => {
    if (onSelect) {
      onSelect();
    }
    closeDropdown();
  };

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    const items = itemRefs.current.filter((item) => item && !item.hasAttribute('data-disabled'));
    const currentIndex = items.findIndex((item) => item === document.activeElement);

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        closeDropdown();
        break;

      case 'ArrowDown':
        e.preventDefault();
        if (items.length > 0) {
          const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
          items[nextIndex]?.focus();
          setFocusedIndex(nextIndex);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (items.length > 0) {
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
          items[prevIndex]?.focus();
          setFocusedIndex(prevIndex);
        }
        break;

      case 'Home':
        e.preventDefault();
        if (items.length > 0) {
          items[0]?.focus();
          setFocusedIndex(0);
        }
        break;

      case 'End':
        e.preventDefault();
        if (items.length > 0) {
          items[items.length - 1]?.focus();
          setFocusedIndex(items.length - 1);
        }
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement && itemRefs.current.includes(document.activeElement)) {
          document.activeElement.click();
        }
        break;

      default:
        break;
    }
  };

  /**
   * Handle click outside to close dropdown
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Update menu position when open
   */
  useEffect(() => {
    if (isOpen) {
      calculatePosition();

      // Recalculate on scroll or resize
      const handleUpdate = () => calculatePosition();
      window.addEventListener('scroll', handleUpdate, true);
      window.addEventListener('resize', handleUpdate);

      // Focus first item when menu opens
      const items = itemRefs.current.filter((item) => item && !item.hasAttribute('data-disabled'));
      if (items.length > 0 && focusedIndex >= 0) {
        items[focusedIndex]?.focus();
      }

      return () => {
        window.removeEventListener('scroll', handleUpdate, true);
        window.removeEventListener('resize', handleUpdate);
      };
    }
  }, [isOpen, focusedIndex]);

  // Clone trigger to add event handlers and ARIA attributes
  const triggerElement = React.cloneElement(trigger, {
    ref: triggerRef,
    onClick: (e) => {
      toggleDropdown();
      trigger.props.onClick?.(e);
    },
    onKeyDown: (e) => {
      handleKeyDown(e);
      trigger.props.onKeyDown?.(e);
    },
    'aria-expanded': isOpen,
    'aria-haspopup': 'menu',
    'aria-controls': isOpen ? menuId.current : undefined,
  });

  // Menu styles using theme tokens
  const menuBaseStyles = 'min-w-[12rem] rounded-md shadow-lg py-1 focus:outline-none';
  const menuColorStyles = 'bg-[var(--color-surface)] border border-[var(--color-border)]';

  return (
    <DropdownContext.Provider
      value={{
        handleItemSelect,
        itemRefs,
        isOpen,
      }}
    >
      {triggerElement}
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId.current}
          role="menu"
          style={menuStyle}
          className={`${menuBaseStyles} ${menuColorStyles} ${className}`}
          onKeyDown={handleKeyDown}
        >
          {children}
        </div>
      )}
    </DropdownContext.Provider>
  );
};

/**
 * Dropdown.Item Component
 * 
 * Individual menu item within a Dropdown.
 * 
 * @example
 * <Dropdown.Item icon={Edit} onSelect={handleEdit}>Edit</Dropdown.Item>
 * <Dropdown.Item disabled>Coming Soon</Dropdown.Item>
 */
const DropdownItem = ({
  children,
  onSelect,
  disabled = false,
  icon: Icon,
  className = '',
}) => {
  const context = useContext(DropdownContext);
  const itemRef = useRef(null);

  if (!context) {
    throw new Error('Dropdown.Item must be used within a Dropdown component');
  }

  const { handleItemSelect, itemRefs } = context;

  // Register item ref
  useEffect(() => {
    if (itemRef.current) {
      itemRefs.current.push(itemRef.current);
    }
    return () => {
      const index = itemRefs.current.indexOf(itemRef.current);
      if (index > -1) {
        itemRefs.current.splice(index, 1);
      }
    };
  }, [itemRefs]);

  /**
   * Handle item click
   */
  const handleClick = () => {
    if (!disabled) {
      handleItemSelect(onSelect);
    }
  };

  // Item styles using theme tokens
  const itemBaseStyles = 'w-full px-4 py-2 text-sm text-left flex items-center gap-2 transition-colors duration-150';
  const itemColorStyles = disabled
    ? 'text-[var(--color-text-secondary)] cursor-not-allowed opacity-50'
    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-background)] cursor-pointer focus:bg-[var(--color-background)] focus:outline-none';

  return (
    <button
      ref={itemRef}
      role="menuitem"
      type="button"
      disabled={disabled}
      data-disabled={disabled ? 'true' : undefined}
      onClick={handleClick}
      className={`${itemBaseStyles} ${itemColorStyles} ${className}`}
      tabIndex={disabled ? -1 : 0}
    >
      {Icon && <Icon className="w-4 h-4" aria-hidden="true" />}
      {children}
    </button>
  );
};

// Attach Item as a static property
Dropdown.Item = DropdownItem;
Dropdown.displayName = 'Dropdown';
DropdownItem.displayName = 'Dropdown.Item';

export default Dropdown;
