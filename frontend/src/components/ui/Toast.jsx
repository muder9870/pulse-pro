import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

/**
 * Toast Component - Design System
 * 
 * Notification system with auto-dismiss and manual close.
 * Uses theme tokens for colors to support light/dark mode.
 * 
 * Variants:
 * - success: Positive feedback
 * - error: Error messages
 * - warning: Warning messages
 * - info: Informational messages
 */

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState([]);
  const [pausedToast, setPausedToast] = useState(null);

  const toast = useCallback(({ variant = 'info', title, description, duration = 5000, onClose }) => {
    const id = Date.now() + Math.random();
    const newToast = { id, variant, title, description, duration, onClose, remainingTime: duration };
    
    setToasts(prev => [...prev, newToast]);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast?.onClose) {
        toast.onClose();
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const pauseToast = useCallback((id) => {
    setPausedToast(id);
  }, []);

  const resumeToast = useCallback((id) => {
    setPausedToast(null);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className={`fixed ${positionClasses[position]} z-50 flex flex-col gap-2 max-w-md`}>
        {toasts.map(t => (
          <ToastItem 
            key={t.id} 
            {...t} 
            onClose={() => removeToast(t.id)}
            isPaused={pausedToast === t.id}
            onPause={() => pauseToast(t.id)}
            onResume={() => resumeToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ id, variant, title, description, duration, onClose, isPaused, onPause, onResume }) => {
  const [progress, setProgress] = useState(100);
  const startTimeRef = React.useRef(Date.now());
  const remainingRef = React.useRef(duration);

  useEffect(() => {
    if (duration <= 0) return;

    const interval = setInterval(() => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingRef.current - elapsed);
        const newProgress = (remaining / duration) * 100;
        
        setProgress(newProgress);
        
        if (remaining <= 0) {
          onClose();
        }
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [duration, isPaused, onClose]);

  // Reset start time when resuming
  useEffect(() => {
    if (!isPaused) {
      startTimeRef.current = Date.now();
    }
  }, [isPaused]);

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const variants = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-blue-500 text-white',
  };

  const Icon = icons[variant] || icons.info;
  const variantClass = variants[variant] || variants.info;

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      className={`${variantClass} rounded-lg shadow-lg overflow-hidden min-w-[320px] animate-in slide-in-from-right duration-300 group`}
    >
      <div className="p-4 flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{title}</div>
          {description && <div className="text-sm opacity-90 mt-1">{description}</div>}
        </div>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Progress bar */}
      {duration > 0 && (
        <div className="h-1 bg-white/30">
          <div 
            className="h-full bg-white/60 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default ToastItem;
