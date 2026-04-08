import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Alert Component - Design System
 * 
 * Displays important messages to users with optional dismiss functionality.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Variants:
 * - success: Positive feedback
 * - error: Error messages
 * - warning: Warning messages
 * - info: Informational messages (default)
 */
const Alert = React.memo(React.forwardRef(({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  icon: CustomIcon,
  className = '',
}, ref) => {
  const [isVisible, setIsVisible] = useState(true);

  const defaultIcons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const variants = {
    success: 'bg-[var(--color-success)]/10 border-[var(--color-success)] text-[var(--color-success)]',
    error: 'bg-[var(--color-danger)]/10 border-[var(--color-danger)] text-[var(--color-danger)]',
    warning: 'bg-[var(--color-warning)]/10 border-[var(--color-warning)] text-[var(--color-warning)]',
    info: 'bg-[var(--color-info)]/10 border-[var(--color-info)] text-[var(--color-info)]',
  };

  // Validate variant and log warning in development
  if (process.env.NODE_ENV === 'development' && !variants[variant]) {
    console.warn(
      `Invalid variant "${variant}" provided to Alert. ` +
      `Valid variants are: ${Object.keys(variants).join(', ')}. ` +
      `Falling back to "info" variant.`
    );
  }

  const Icon = CustomIcon || defaultIcons[variant] || defaultIcons.info;
  const variantClass = variants[variant] || variants.info;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!isVisible) {
    return null;
  }

  // Use role="alert" for errors, role="status" for others
  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div
      ref={ref}
      role={role}
      className={`${variantClass} border-l-4 rounded-lg p-4 flex items-start gap-3 transition-all duration-200 ${className}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-semibold text-sm mb-1 text-[var(--color-text-primary)]">
            {title}
          </div>
        )}
        <div className="text-sm text-[var(--color-text-secondary)]">{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity text-[var(--color-text-secondary)]"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}));

Alert.displayName = 'Alert';

export default Alert;
