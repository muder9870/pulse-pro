import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * BulkOperationProgress Component
 * Displays loading state for bulk operations with progress tracking
 * 
 * Requirements: 10.1, 10.2
 */
const BulkOperationProgress = ({ 
  operationName, 
  current, 
  total, 
  isActive 
}) => {
  if (!isActive) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Operation Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{operationName}</h3>
            <p className="text-sm text-gray-500">Please wait...</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">
              Processing {current} of {total} articles
            </span>
            <span className="font-bold text-indigo-600">{percentage}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Info Message */}
        <p className="mt-6 text-xs text-gray-500 text-center">
          Other actions are disabled while this operation is in progress
        </p>
      </div>
    </div>
  );
};

export default BulkOperationProgress;
