import React from 'react';

/**
 * Grid Component - Design System
 * 
 * A layout component that arranges children in a responsive grid with configurable columns and gap.
 * Uses theme spacing tokens to ensure consistency across the application.
 * 
 * Columns:
 * - number: Fixed number of columns (e.g., 3)
 * - object: Responsive columns with breakpoints { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }
 * - default: 1 column
 * 
 * Gap (uses theme tokens):
 * - xs: 0.25rem (4px)
 * - sm: 0.5rem (8px)
 * - md: 1rem (16px) - default
 * - lg: 1.5rem (24px)
 * - xl: 2rem (32px)
 * 
 * Breakpoints:
 * - xs: 0px (mobile)
 * - sm: 640px (small tablet)
 * - md: 768px (tablet)
 * - lg: 1024px (desktop)
 * - xl: 1280px (large desktop)
 */
const Grid = React.forwardRef(({
  children,
  columns = 1,
  gap = 'md',
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'grid';
  
  // Gap styles - maps to theme tokens
  const gapStyles = {
    xs: 'gap-1',  // 4px
    sm: 'gap-2',  // 8px
    md: 'gap-4',  // 16px
    lg: 'gap-6',  // 24px
    xl: 'gap-8',  // 32px
  };
  
  // Column styles for fixed number
  const fixedColumnStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    7: 'grid-cols-7',
    8: 'grid-cols-8',
    9: 'grid-cols-9',
    10: 'grid-cols-10',
    11: 'grid-cols-11',
    12: 'grid-cols-12',
  };
  
  // Responsive column styles
  const responsiveColumnStyles = {
    xs: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
      7: 'grid-cols-7',
      8: 'grid-cols-8',
      9: 'grid-cols-9',
      10: 'grid-cols-10',
      11: 'grid-cols-11',
      12: 'grid-cols-12',
    },
    sm: {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
      5: 'sm:grid-cols-5',
      6: 'sm:grid-cols-6',
      7: 'sm:grid-cols-7',
      8: 'sm:grid-cols-8',
      9: 'sm:grid-cols-9',
      10: 'sm:grid-cols-10',
      11: 'sm:grid-cols-11',
      12: 'sm:grid-cols-12',
    },
    md: {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
      5: 'md:grid-cols-5',
      6: 'md:grid-cols-6',
      7: 'md:grid-cols-7',
      8: 'md:grid-cols-8',
      9: 'md:grid-cols-9',
      10: 'md:grid-cols-10',
      11: 'md:grid-cols-11',
      12: 'md:grid-cols-12',
    },
    lg: {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
      7: 'lg:grid-cols-7',
      8: 'lg:grid-cols-8',
      9: 'lg:grid-cols-9',
      10: 'lg:grid-cols-10',
      11: 'lg:grid-cols-11',
      12: 'lg:grid-cols-12',
    },
    xl: {
      1: 'xl:grid-cols-1',
      2: 'xl:grid-cols-2',
      3: 'xl:grid-cols-3',
      4: 'xl:grid-cols-4',
      5: 'xl:grid-cols-5',
      6: 'xl:grid-cols-6',
      7: 'xl:grid-cols-7',
      8: 'xl:grid-cols-8',
      9: 'xl:grid-cols-9',
      10: 'xl:grid-cols-10',
      11: 'xl:grid-cols-11',
      12: 'xl:grid-cols-12',
    },
  };
  
  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    if (!gapStyles[gap]) {
      console.warn(
        `Invalid gap "${gap}" provided to Grid. ` +
        `Valid gap values are: ${Object.keys(gapStyles).join(', ')}. ` +
        `Falling back to "md".`
      );
    }
    
    if (typeof columns === 'number' && !fixedColumnStyles[columns]) {
      console.warn(
        `Invalid columns "${columns}" provided to Grid. ` +
        `Valid column values are: 1-12. ` +
        `Falling back to 1.`
      );
    }
    
    if (typeof columns === 'object') {
      const validBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
      Object.keys(columns).forEach(breakpoint => {
        if (!validBreakpoints.includes(breakpoint)) {
          console.warn(
            `Invalid breakpoint "${breakpoint}" provided to Grid columns. ` +
            `Valid breakpoints are: ${validBreakpoints.join(', ')}.`
          );
        }
        
        const value = columns[breakpoint];
        if (value < 1 || value > 12) {
          console.warn(
            `Invalid column value "${value}" for breakpoint "${breakpoint}". ` +
            `Valid column values are: 1-12.`
          );
        }
      });
    }
  }
  
  // Build column classes
  let columnClasses = '';
  if (typeof columns === 'number') {
    // Fixed columns
    columnClasses = fixedColumnStyles[columns] || fixedColumnStyles[1];
  } else if (typeof columns === 'object') {
    // Responsive columns
    const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
    breakpoints.forEach(breakpoint => {
      if (columns[breakpoint]) {
        const colValue = columns[breakpoint];
        if (colValue >= 1 && colValue <= 12) {
          const style = responsiveColumnStyles[breakpoint][colValue];
          if (style) {
            columnClasses += ` ${style}`;
          }
        }
      }
    });
    
    // If no valid breakpoints provided, default to 1 column
    if (!columnClasses.trim()) {
      columnClasses = fixedColumnStyles[1];
    }
  } else {
    // Invalid type, default to 1 column
    columnClasses = fixedColumnStyles[1];
  }
  
  // Safe gap value with fallback
  const safeGap = gapStyles[gap] || gapStyles.md;
  
  return (
    <div
      ref={ref}
      className={`${baseStyles} ${columnClasses} ${safeGap} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Grid.displayName = 'Grid';

export default Grid;
