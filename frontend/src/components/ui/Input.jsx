import React from 'react';
import LiveRegion from './LiveRegion';

/**
 * Input Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 * Includes accessibility features: labels, error messages with aria-live announcements.
 */
const Input = React.forwardRef(({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'px-3 py-2 border rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-background)] text-[var(--color-text-primary)]';
  
  const errorStyles = error
    ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)] focus:border-[var(--color-danger)]'
    : 'border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  const iconPadding = Icon
    ? iconPosition === 'left'
      ? 'pl-10'
      : 'pr-10'
    : '';

  const inputId = `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;

  return (
    <div className={widthClass}>
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={`${baseStyles} ${errorStyles} ${iconPadding} ${widthClass} ${className}`}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helperId].filter(Boolean).join(' ')}
          {...props}
        />
        
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
      </div>
      
      {helperText && !error && (
        <p id={helperId} className="mt-1 text-xs text-gray-500">
          {helperText}
        </p>
      )}
      
      {error && (
        <>
          <p id={errorId} className="mt-1 text-xs text-red-500">
            {error}
          </p>
          <LiveRegion aria-live="assertive" role="alert">
            {error}
          </LiveRegion>
        </>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Named export for compatibility
export { Input };

export default Input;
