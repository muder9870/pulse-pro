import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Enhanced Modal Component - Design System
 * 
 * Features:
 * - Focus trap and management
 * - Return focus to trigger on close
 * - Initial focus on first focusable element
 * - ESC key handling
 * - Click outside to close
 * - ARIA attributes for accessibility
 */
const Modal = ({
  open,
  onClose,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  showCloseButton = true,
  title,
  className = '',
  'aria-label': ariaLabel,
  initialFocusRef,
  ...props
}) => {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const closeButtonRef = useRef(null);
  
  // Store previous focus when opening
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      
      // Focus management
      setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        } else {
          modalRef.current?.focus();
        }
      }, 0);
    } else {
      document.body.style.overflow = 'unset';
      // Return focus to previous element
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, initialFocusRef]);
  
  // Focus trap
  useEffect(() => {
    if (!open) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);
    return () => modal.removeEventListener('keydown', handleTabKey);
  }, [open]);
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };
  
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          relative w-full rounded-xl bg-[var(--color-surface)] shadow-xl
          ${sizes[size]}
          ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-label={ariaLabel}
        tabIndex={-1}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
            {title && (
              <h2 id="modal-title" className="text-lg font-semibold text-[var(--color-text-primary)]">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

// Modal subcomponents
const ModalHeader = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-[var(--color-border)] ${className}`} {...props}>
    {children}
  </div>
);

const ModalTitle = ({ children, className = '', ...props }) => (
  <h2 className={`text-lg font-semibold text-[var(--color-text-primary)] ${className}`} {...props}>
    {children}
  </h2>
);

const ModalDescription = ({ children, className = '', ...props }) => (
  <p className={`text-sm text-[var(--color-text-secondary)] ${className}`} {...props}>
    {children}
  </p>
);

const ModalBody = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </div>
);

const ModalFooter = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-t border-[var(--color-border)] flex justify-end space-x-2 ${className}`} {...props}>
    {children}
  </div>
);

Modal.displayName = 'Modal';
ModalHeader.displayName = 'ModalHeader';
ModalTitle.displayName = 'ModalTitle';
ModalDescription.displayName = 'ModalDescription';
ModalBody.displayName = 'ModalBody';
ModalFooter.displayName = 'ModalFooter';

// Attach subcomponents to Modal
Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Description = ModalDescription;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter };
export default Modal;
