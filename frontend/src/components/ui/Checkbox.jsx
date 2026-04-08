import React from 'react';
import { Check } from 'lucide-react';

/**
 * Checkbox Component - Design System
 * 
 * Uses theme tokens for colors to support light/dark mode.
 */
const Checkbox = React.forwardRef(({
  label,
  description,
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  className = '',
  ...props
}, ref) => {
  const checkboxRef = React.useRef(null);
  
  // Handle indeterminate state
  React.useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate && !checked;
    }
  }, [indeterminate, checked]);
  
  return (
    <label className={`flex items-start gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}>
      <div className="relative flex items-center justify-center">
        <input
          ref={(node) => {
            checkboxRef.current = node;
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
            checked || indeterminate
              ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
              : 'bg-[var(--color-background)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          {indeterminate && !checked && (
            <div className="w-2.5 h-0.5 bg-white rounded" />
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <span className="text-sm font-medium text-[var(--color-text-primary)] block">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-[var(--color-text-secondary)] block mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;
