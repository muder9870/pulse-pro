import React from 'react';

/**
 * LiveRegion Component
 * 
 * Announces content changes to screen readers.
 * Essential for form error messages and dynamic updates.
 * 
 * Usage:
 * <LiveRegion aria-live="polite">
 *   {errorMessage}
 * </LiveRegion>
 */
const LiveRegion = ({
  children,
  'aria-live': ariaLive = 'polite',
  'aria-atomic': ariaAtomic = 'true',
  className = '',
  ...props
}) => {
  return (
    <div
      aria-live={ariaLive}
      aria-atomic={ariaAtomic}
      className={`sr-only ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * ErrorLiveRegion - Specialized for form errors
 */
export const ErrorLiveRegion = ({ errors, id }) => {
  const errorText = Object.values(errors || {}).join('. ');
  
  if (!errorText) return null;
  
  return (
    <LiveRegion 
      id={id} 
      aria-live="assertive"
      role="alert"
    >
      Form has errors: {errorText}
    </LiveRegion>
  );
};

export default LiveRegion;
