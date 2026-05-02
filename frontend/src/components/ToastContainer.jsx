import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContainer = ({ toasts, onRemove }) => {
  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-500',
          icon: CheckCircle,
          iconColor: 'text-green-600 dark:text-green-400',
          iconBg: 'bg-green-100 dark:bg-green-900/40',
          textColor: 'text-green-900 dark:text-green-100'
        };
      case 'error':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-500',
          icon: XCircle,
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/40',
          textColor: 'text-red-900 dark:text-red-100'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-500',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
          textColor: 'text-yellow-900 dark:text-yellow-100'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-500',
          icon: Info,
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/40',
          textColor: 'text-blue-900 dark:text-blue-100'
        };
    }
  };

  return (
    <div className="fixed top-20 right-6 z-50 space-y-3 max-w-md w-96">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);
        const Icon = styles.icon;
        
        return (
          <div
            key={toast.id}
            className={`
              w-full ${styles.bg} shadow-2xl rounded-xl border-l-4 ${styles.border}
              transform transition-all duration-300 ease-in-out
              animate-in slide-in-from-right-5 fade-in
            `}
          >
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 ${styles.iconBg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${styles.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-semibold ${styles.textColor} leading-snug`}>
                    {toast.message}
                  </p>
                  {toast.description && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onRemove(toast.id)}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                  aria-label="Close notification"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ToastContainer;
