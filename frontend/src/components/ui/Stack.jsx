import React from 'react';

/**
 * Stack Component - Design System
 * 
 * A layout component that arranges children in a vertical or horizontal stack with consistent spacing.
 * Uses theme spacing tokens to ensure consistency across the application.
 * 
 * Direction:
 * - horizontal: Arranges children in a row (flex-row)
 * - vertical: Arranges children in a column (flex-col) - default
 * 
 * Spacing (uses theme tokens):
 * - xs: 0.25rem (4px)
 * - sm: 0.5rem (8px)
 * - md: 1rem (16px) - default
 * - lg: 1.5rem (24px)
 * - xl: 2rem (32px)
 * 
 * Align (cross-axis alignment):
 * - start: Items aligned to start
 * - center: Items centered
 * - end: Items aligned to end
 * - stretch: Items stretched to fill container
 * 
 * Justify (main-axis alignment):
 * - start: Items aligned to start - default
 * - center: Items centered
 * - end: Items aligned to end
 * - between: Items distributed with space between
 * - around: Items distributed with space around
 * 
 * Wrap:
 * - true: Items wrap to next line when needed
 * - false: Items stay on single line - default
 */
const Stack = React.forwardRef(({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'flex';
  
  // Direction styles
  const directionStyles = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };
  
  // Spacing styles - maps to theme tokens
  const spacingStyles = {
    horizontal: {
      xs: 'gap-1',  // 4px
      sm: 'gap-2',  // 8px
      md: 'gap-4',  // 16px
      lg: 'gap-6',  // 24px
      xl: 'gap-8',  // 32px
    },
    vertical: {
      xs: 'gap-1',  // 4px
      sm: 'gap-2',  // 8px
      md: 'gap-4',  // 16px
      lg: 'gap-6',  // 24px
      xl: 'gap-8',  // 32px
    },
  };
  
  // Align styles (cross-axis)
  const alignStyles = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };
  
  // Justify styles (main-axis)
  const justifyStyles = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };
  
  // Wrap styles
  const wrapStyles = wrap ? 'flex-wrap' : 'flex-nowrap';
  
  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    if (!directionStyles[direction]) {
      console.warn(
        `Invalid direction "${direction}" provided to Stack. ` +
        `Valid directions are: ${Object.keys(directionStyles).join(', ')}. ` +
        `Falling back to "vertical".`
      );
    }
    
    if (directionStyles[direction] && !spacingStyles[direction]?.[spacing]) {
      console.warn(
        `Invalid spacing "${spacing}" provided to Stack. ` +
        `Valid spacing values are: ${Object.keys(spacingStyles.vertical).join(', ')}. ` +
        `Falling back to "md".`
      );
    }
    
    if (!alignStyles[align]) {
      console.warn(
        `Invalid align "${align}" provided to Stack. ` +
        `Valid align values are: ${Object.keys(alignStyles).join(', ')}. ` +
        `Falling back to "stretch".`
      );
    }
    
    if (!justifyStyles[justify]) {
      console.warn(
        `Invalid justify "${justify}" provided to Stack. ` +
        `Valid justify values are: ${Object.keys(justifyStyles).join(', ')}. ` +
        `Falling back to "start".`
      );
    }
  }
  
  // Safe values with fallbacks
  const safeDirection = directionStyles[direction] || directionStyles.vertical;
  const safeSpacing = spacingStyles[direction]?.[spacing] || spacingStyles.vertical.md;
  const safeAlign = alignStyles[align] || alignStyles.stretch;
  const safeJustify = justifyStyles[justify] || justifyStyles.start;
  
  return (
    <div
      ref={ref}
      className={`${baseStyles} ${safeDirection} ${safeSpacing} ${safeAlign} ${safeJustify} ${wrapStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Stack.displayName = 'Stack';

export default Stack;
