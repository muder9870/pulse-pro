import React from 'react';

/**
 * Badge Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Variants:
 * - secondary: Gray (default)
 * - primary: Indigo
 * - success: Green
 * - warning: Amber
 * - danger: Red
 * - info: Blue
 * 
 * Sizes:
 * - xs: Extra small (text-[9px], px-1.5, py-0.5)
 * - sm: Small (text-[10px], px-2, py-0.5)
 * - md: Medium (text-xs, px-2.5, py-1) - default
 * - lg: Large (text-sm, px-3, py-1.5)
 */
const Badge = React.memo(React.forwardRef(({
  children,
  variant = 'secondary',
  size = 'md',
  dot = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-full';
  
  // Variant styles using theme tokens via CSS variables
  // Using lighter backgrounds with colored text for better readability
  const variants = {
    secondary: 'bg-[var(--color-surface)] text-[var(--color-secondary)] border border-[var(--color-border)]',
    primary: 'bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)] text-[var(--color-primary)] border border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)]',
    success: 'bg-[color-mix(in_srgb,var(--color-success)_15%,transparent)] text-[var(--color-success)] border border-[color-mix(in_srgb,var(--color-success)_30%,transparent)]',
    warning: 'bg-[color-mix(in_srgb,var(--color-warning)_15%,transparent)] text-[var(--color-warning)] border border-[color-mix(in_srgb,var(--color-warning)_30%,transparent)]',
    danger: 'bg-[color-mix(in_srgb,var(--color-danger)_15%,transparent)] text-[var(--color-danger)] border border-[color-mix(in_srgb,var(--color-danger)_30%,transparent)]',
    info: 'bg-[color-mix(in_srgb,var(--color-info)_15%,transparent)] text-[var(--color-info)] border border-[color-mix(in_srgb,var(--color-info)_30%,transparent)]',
  };
  
  const sizes = {
    xs: 'text-[9px] px-1.5 py-0.5',
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  // Dot colors using theme tokens
  const dotColors = {
    secondary: 'bg-[var(--color-secondary)]',
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
    info: 'bg-[var(--color-info)]',
  };
  
  // Validate variant and log warning in development
  if (process.env.NODE_ENV === 'development' && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Badge. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "secondary" variant.`
    );
  }
  
  const safeVariant = variants[variant] || variants.secondary;
  const safeDotColor = dotColors[variant] || dotColors.secondary;
  
  return (
    <span
      ref={ref}
      className={`${baseStyles} ${safeVariant} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${safeDotColor}`} />}
      {children}
    </span>
  );
}));

Badge.displayName = 'Badge';

// Named export for compatibility
export { Badge };

export default Badge;
