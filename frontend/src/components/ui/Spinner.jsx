import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Spinner Component - Design System
 * 
 * Loading indicator with smooth rotation animation.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Sizes:
 * - xs: 12px
 * - sm: 16px
 * - md: 24px (default)
 * - lg: 32px
 * - xl: 48px
 * 
 * Variants:
 * - primary: Primary brand color
 * - secondary: Secondary/neutral color
 * - white: White color (for dark backgrounds)
 */
const Spinner = React.memo(({ size = 'md', variant = 'primary', className = '' }) => {
  const sizes = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const variants = {
    primary: 'text-[var(--color-primary)]',
    secondary: 'text-[var(--color-secondary)]',
    white: 'text-white',
  };

  // Validate variant and log warning in development
  if (process.env.NODE_ENV === 'development' && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Spinner. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "primary" variant.`
    );
  }

  const safeVariant = variants[variant] || variants.primary;

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-flex items-center justify-center ${className}`}
    >
      <Loader2 className={`${sizes[size]} ${safeVariant} animate-spin`} />
      <span className="sr-only">Loading...</span>
    </div>
  );
});

Spinner.displayName = 'Spinner';

export default Spinner;
