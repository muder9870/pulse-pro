import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

/**
 * BulkOperationError Component
 * Enhanced error state UI for bulk operations with retry and dismiss functionality
 * 
 * Requirements: 10.3, 10.4, 10.5
 */
const BulkOperationError = ({ 
  operationName,
  failedArticles = [],
  onRetry,
  onDismiss,
  isVisible 
}) => {
  if (!isVisible || failedArticles.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-8 z-50 max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-red-200 overflow-hidden">
        {/* Error Header */}
        <div className="bg-red-50 px-6 py-4 border-b border-red-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-900">
                {operationName} Failed
              </h3>
              <p className="text-xs text-red-700 mt-1">
                {failedArticles.length} article{failedArticles.length > 1 ? 's' : ''} could not be processed
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-red-100 rounded-lg transition-colors"
              aria-label="Dismiss error"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>

        {/* Failed Articles List (Requirement 10.4) */}
        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <p className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">
            Failed Articles:
          </p>
          <div className="space-y-2">
            {failedArticles.map((article, index) => (
              <div 
                key={article.id || index}
                className="bg-slate-50 rounded-lg p-3 border border-slate-200"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      Article ID: {article.id}
                    </p>
                    {article.title && (
                      <p className="text-xs text-slate-600 truncate mt-1">
                        {article.title}
                      </p>
                    )}
                    {/* Specific error message (Requirement 10.3, 10.4) */}
                    <p className="text-xs text-red-600 mt-2 break-words">
                      {article.error || 'Unknown error occurred'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons (Requirements 10.5) */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          {/* Dismiss option (Requirement 10.5) */}
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Dismiss
          </button>
          {/* Retry option (Requirement 10.5) */}
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all transform active:scale-95 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Failed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkOperationError;
