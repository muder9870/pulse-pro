import React from 'react';

/**
 * LiveRegion Component
 * 
 * Announces content changes to screen readers.
 * Essential for form error messages and dynamic updates.
 * Bulletproof semantic separation from visible content.
 * 
 * Usage:
 * <LiveRegion message="Error occurred: Invalid email format" />
 * OR
 * <LiveRegion aria-live="polite">
 *   {errorMessage}
 * </LiveRegion>
 */
const LiveRegion = ({
  children,
  message,
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
      role="alert"
      {...props}
    >
      {message || children}
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
