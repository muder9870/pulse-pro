import React from 'react';

/**
 * Progress Component - Design System
 * 
 * Displays progress indicators in determinate or indeterminate modes.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Modes:
 * - Determinate: Shows specific progress (value prop provided)
 * - Indeterminate: Shows loading animation (no value prop)
 * 
 * Variants:
 * - primary: Primary brand color (default)
 * - success: Success/completion color
 * - warning: Warning color
 * - danger: Error/danger color
 * 
 * Sizes:
 * - sm: 4px height
 * - md: 8px height (default)
 * - lg: 12px height
 */
const Progress = React.memo(({
  value,
  max = 100,
  variant = 'primary',
  size = 'md',
  showLabel = false,
  indeterminate = false,
  className = '',
}) => {
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  const variants = {
    primary: 'bg-[var(--color-primary)]',
    success: 'bg-[var(--color-success)]',
    warning: 'bg-[var(--color-warning)]',
    danger: 'bg-[var(--color-danger)]',
  };

  // Validate variant and log warning in development
  if (process.env.NODE_ENV === 'development' && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Progress. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "primary" variant.`
    );
  }

  const sizeClass = sizes[size] || sizes.md;
  const variantClass = variants[variant] || variants.primary;

  // Calculate percentage for determinate mode
  const percentage = indeterminate ? 0 : Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={indeterminate ? undefined : 0}
        aria-valuemax={indeterminate ? undefined : max}
        aria-label={indeterminate ? 'Loading' : `${percentage.toFixed(0)}% complete`}
        className={`${sizeClass} w-full bg-[var(--color-surface)] rounded-full overflow-hidden`}
      >
        {indeterminate ? (
          <div
            className={`${sizeClass} ${variantClass} rounded-full animate-pulse`}
            style={{
              width: '100%',
              animation: 'indeterminate 1.5s ease-in-out infinite',
            }}
          />
        ) : (
          <div
            className={`${sizeClass} ${variantClass} rounded-full transition-all duration-300 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
      {showLabel && !indeterminate && (
        <div className="text-sm text-[var(--color-text-secondary)] mt-1 text-right">
          {percentage.toFixed(0)}%
        </div>
      )}
      <style jsx>{`
        @keyframes indeterminate {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
});

Progress.displayName = 'Progress';

export default Progress;
