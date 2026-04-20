import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Enhanced Button Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 * Includes accessibility improvements and enhanced loading states.
 * 
 * Variants:
 * - primary: Main action buttons
 * - secondary: Secondary actions
 * - success: Positive actions
 * - danger: Destructive actions
 * - warning: Warning actions
 * - info: Informational actions
 * - ghost: Minimal styling
 * 
 * Sizes:
 * - xs: Extra small (text-xs, py-1, px-2)
 * - sm: Small (text-sm, py-1.5, px-3)
 * - md: Medium (text-sm, py-2, px-4) - default
 * - lg: Large (text-base, py-3, px-6)
 * - xl: Extra large (text-lg, py-4, px-8)
 */
const Button = React.forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Variant styles using theme tokens via CSS variables
  const variants = {
    primary: 'bg-[var(--color-primary)] hover:brightness-90 text-white focus:ring-[var(--color-primary)] shadow-sm hover:shadow-md',
    secondary: 'bg-[var(--color-surface)] hover:brightness-95 dark:hover:brightness-110 text-[var(--color-text-primary)] focus:ring-[var(--color-secondary)] border border-[var(--color-border)]',
    success: 'bg-[var(--color-success)] hover:brightness-90 text-white focus:ring-[var(--color-success)] shadow-sm hover:shadow-md',
    danger: 'bg-[var(--color-danger)] hover:brightness-90 text-white focus:ring-[var(--color-danger)] shadow-sm hover:shadow-md',
    warning: 'bg-[var(--color-warning)] hover:brightness-90 text-white focus:ring-[var(--color-warning)] shadow-sm hover:shadow-md',
    info: 'bg-[var(--color-info)] hover:brightness-90 text-white focus:ring-[var(--color-info)] shadow-sm hover:shadow-md',
    ghost: 'hover:bg-[var(--color-surface)] text-[var(--color-text-primary)] focus:ring-[var(--color-secondary)]',
  };
  
  const sizes = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-sm py-1.5 px-3',
    md: 'text-sm py-2 px-4',
    lg: 'text-base py-3 px-6',
    xl: 'text-lg py-4 px-8',
  };
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Validate variant and log warning in development
  if (import.meta.env.DEV && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Button. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "primary" variant.`
    );
  }
  
  const safeVariant = variants[variant] || variants.primary;
  
  // Generate accessible label for screen readers
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel;
    if (loading) return 'Loading...';
    if (typeof children === 'string') return children;
    return '';
  };
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${safeVariant} ${sizes[size]} ${widthClass} ${className}`}
      aria-label={getAriaLabel()}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <Loader2 
          className="w-4 h-4 animate-spin" 
          aria-hidden="true"
        />
      )}
      {!loading && Icon && iconPosition === 'left' && (
        <Icon className="w-4 h-4" aria-hidden="true" />
      )}
      <span className={loading ? 'sr-only' : ''}>
        {children}
      </span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
});

Button.displayName = 'Button';

// Named export for compatibility
export { Button };

export default Button;
