import React from 'react';

/**
 * Card Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Variants:
 * - default: Surface background with border
 * - elevated: Surface with shadow
 * - glass: Glassmorphism effect
 * - dark: Dark background for dark mode sections
 * 
 * Padding:
 * - none: No padding
 * - sm: Small padding (12px)
 * - md: Medium padding (20px) - default
 * - lg: Large padding (32px)
 * - xl: Extra large padding (40px)
 */
const Card = React.memo(React.forwardRef(({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hover = false,
  ...props
}, ref) => {
  const baseStyles = 'rounded-xl transition-all duration-200';
  
  // Variant styles using theme tokens via CSS variables
  const variants = {
    default: 'bg-[var(--color-surface)] border border-[var(--color-border)]',
    elevated: 'bg-[var(--color-surface)] shadow-sm hover:shadow-md border border-[var(--color-border)]',
    glass: 'bg-[var(--color-surface)]/80 backdrop-blur-md border border-[var(--color-border)]/20 shadow-lg',
    dark: 'bg-[var(--color-background)]/40 backdrop-blur-xl border border-[var(--color-border)]/10',
  };
  
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-8',
    xl: 'p-10',
  };
  
  const hoverClass = hover ? 'hover:-translate-y-1 hover:shadow-lg cursor-pointer' : '';
  
  // Validate variant and log warning in development
  if (process.env.NODE_ENV === 'development' && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Card. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "default" variant.`
    );
  }
  
  const safeVariant = variants[variant] || variants.default;
  
  return (
    <div
      ref={ref}
      className={`${baseStyles} ${safeVariant} ${paddings[padding]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}));

const CardHeader = React.memo(({ children, className = '', ...props }) => (
  <div className={`mb-4 ${className}`} {...props}>
    {children}
  </div>
));

const CardTitle = React.memo(({ children, className = '', ...props }) => (
  <h3 className={`text-lg font-bold text-[var(--color-text-primary)] ${className}`} {...props}>
    {children}
  </h3>
));

const CardDescription = React.memo(({ children, className = '', ...props }) => (
  <p className={`text-sm text-[var(--color-text-secondary)] ${className}`} {...props}>
    {children}
  </p>
));

const CardContent = React.memo(({ children, className = '', ...props }) => (
  <div className={`space-y-4 ${className}`} {...props}>
    {children}
  </div>
));

const CardFooter = React.memo(({ children, className = '', ...props }) => (
  <div
    className={`flex items-center pt-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));

Card.displayName = 'Card';
CardHeader.displayName = 'CardHeader';
CardTitle.displayName = 'CardTitle';
CardDescription.displayName = 'CardDescription';
CardContent.displayName = 'CardContent';
CardFooter.displayName = 'CardFooter';

// Attach sub-components to Card for dot-notation usage (e.g. <Card.Content>)
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// Default export
export default Card;
