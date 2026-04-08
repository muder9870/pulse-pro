import React from 'react';

/**
 * Flex Component - Design System
 * 
 * A layout component that arranges children using flexbox with configurable direction, alignment, and spacing.
 * Uses theme spacing tokens to ensure consistency across the application.
 * 
 * Direction:
 * - row: Arranges children in a row (flex-row) - default
 * - column: Arranges children in a column (flex-col)
 * 
 * Align (cross-axis alignment):
 * - start: Items aligned to start
 * - center: Items centered
 * - end: Items aligned to end
 * - stretch: Items stretched to fill container - default
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
 * 
 * Gap (uses theme tokens):
 * - xs: 0.25rem (4px)
 * - sm: 0.5rem (8px)
 * - md: 1rem (16px)
 * - lg: 1.5rem (24px)
 * - xl: 2rem (32px)
 */
const Flex = React.forwardRef(({
  children,
  direction = 'row',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  gap,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'flex';
  
  // Direction styles
  const directionStyles = {
    row: 'flex-row',
    column: 'flex-col',
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
  
  // Gap styles - maps to theme tokens
  const gapStyles = {
    xs: 'gap-1',  // 4px
    sm: 'gap-2',  // 8px
    md: 'gap-4',  // 16px
    lg: 'gap-6',  // 24px
    xl: 'gap-8',  // 32px
  };
  
  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    if (!directionStyles[direction]) {
      console.warn(
        `Invalid direction "${direction}" provided to Flex. ` +
        `Valid directions are: ${Object.keys(directionStyles).join(', ')}. ` +
        `Falling back to "row".`
      );
    }
    
    if (!alignStyles[align]) {
      console.warn(
        `Invalid align "${align}" provided to Flex. ` +
        `Valid align values are: ${Object.keys(alignStyles).join(', ')}. ` +
        `Falling back to "stretch".`
      );
    }
    
    if (!justifyStyles[justify]) {
      console.warn(
        `Invalid justify "${justify}" provided to Flex. ` +
        `Valid justify values are: ${Object.keys(justifyStyles).join(', ')}. ` +
        `Falling back to "start".`
      );
    }
    
    if (gap && !gapStyles[gap]) {
      console.warn(
        `Invalid gap "${gap}" provided to Flex. ` +
        `Valid gap values are: ${Object.keys(gapStyles).join(', ')}. ` +
        `Gap will be ignored.`
      );
    }
  }
  
  // Safe values with fallbacks
  const safeDirection = directionStyles[direction] || directionStyles.row;
  const safeAlign = alignStyles[align] || alignStyles.stretch;
  const safeJustify = justifyStyles[justify] || justifyStyles.start;
  const safeGap = gap ? (gapStyles[gap] || '') : '';
  
  return (
    <div
      ref={ref}
      className={`${baseStyles} ${safeDirection} ${safeAlign} ${safeJustify} ${wrapStyles} ${safeGap} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Flex.displayName = 'Flex';

export default Flex;
