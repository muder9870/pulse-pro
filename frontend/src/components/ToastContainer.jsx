import React from 'react';
import { X } from 'lucide-react';

const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto
            transform transition-all duration-300 ease-in-out
            ${toast.type === 'success' ? 'border-green-500' : ''}
            ${toast.type === 'error' ? 'border-red-500' : ''}
            ${toast.type === 'warning' ? 'border-yellow-500' : ''}
            ${toast.type === 'info' ? 'border-blue-500' : ''}
          `}
        >
          <div className="p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {toast.type === 'success' && (
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 1.414l-8-8a1 1 0 00-1.414 1.414L10.586 9.172a1 1 0 001.414 1.414 1.414 0 002.828 2.828 0 00-1.414 1.414l-1.887 1.683c-.366.368-.825-.54-1.811-.657-.825-.72-1.811-.826-1.811-.368-.825.54-1.811.657-.825.72-1.811.826-1.811.368-.825.54-1.811.657-.825.72-1.811.826-1.811z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'error' && (
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 11-16 0 8 8 0 018-8v-2a6 6 0 00-6 6h-2a6 6 0 00-6 6v2a8 8 0 0018 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'warning' && (
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.279 1.545-1.451 1.683-1.811l1.568-1.887a1 1 0 001.414 1.414 1.414 0 002.828 2.828 0 00-1.414 1.414l-1.887 1.683c-.366.368-.825-.54-1.811-.657-.825-.72-1.811-.826-1.811.368-.825.54-1.811.657-.825.72-1.811.826-1.811.368-.825.54-1.811.657-.825.72-1.811.826-1.811z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {toast.type === 'info' && (
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0l-8-4v4l8-4v8a2 2 0 002 2h8a2 2 0 002-2v-8a2 2 0 002-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ml-3 w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {toast.message}
                </p>
                {toast.description && (
                  <p className="mt-1 text-sm text-gray-500">
                    {toast.description}
                  </p>
                )}
              </div>
              <div className="ml-4 flex-shrink-0">
                <button
                  onClick={() => onRemove(toast.id)}
                  className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <span className="sr-only">Close</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
