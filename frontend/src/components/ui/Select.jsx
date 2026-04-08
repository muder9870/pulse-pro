import React from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Select Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 */
const Select = React.forwardRef(({
  label,
  error,
  helperText,
  options = [],
  placeholder = 'Select an option',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'px-3 py-2 pr-10 border rounded-lg text-sm transition-all duration-200 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-[var(--color-background)] text-[var(--color-text-primary)]';
  
  const errorStyles = error
    ? 'border-[var(--color-danger)] focus:ring-[var(--color-danger)] focus:border-[var(--color-danger)]'
    : 'border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]';
  
  const widthClass = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={`${baseStyles} ${errorStyles} ${widthClass} ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={typeof option === 'string' ? option : option.value}
              value={typeof option === 'string' ? option : option.value}
            >
              {typeof option === 'string' ? option : option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-text-secondary)]">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      )}
      {helperText && !error && (
        <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{helperText}</p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
