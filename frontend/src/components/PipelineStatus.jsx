import React from 'react';
import { usePipeline } from '../hooks/usePipeline';
import { Loader2, CheckCircle2, XCircle, PauseCircle } from 'lucide-react';
import { Badge } from './ui/Badge';

/**
 * PipelineStatus Component
 * 
 * Displays pipeline execution status with semantic states:
 * - idle: Pipeline ready to run
 * - running: Pipeline actively processing  
 * - success: Last run completed successfully
 * - failed: Last run encountered errors
 * 
 * Uses SSE via usePipeline hook for real-time updates.
 */
const PipelineStatus = ({ 
  activeTheme = 'dark' 
}) => {
  const { stage = 'idle', message = 'Pipeline is idle', progress = 0, connectionState } = usePipeline();
  const isDark = activeTheme === 'dark';

  const statusConfig = {
    idle: {
      icon: PauseCircle,
      variant: 'secondary',
      color: isDark ? 'text-slate-400' : 'text-gray-500',
      bg: isDark ? 'bg-slate-800/50' : 'bg-gray-100',
      border: isDark ? 'border-slate-700' : 'border-gray-200',
      barColor: 'bg-slate-500',
      label: 'Idle',
    },
    running: {
      icon: Loader2,
      variant: 'info',
      color: 'text-blue-400',
      bg: isDark ? 'bg-blue-900/20' : 'bg-blue-50',
      border: 'border-blue-500/30',
      barColor: 'bg-blue-500',
      label: 'Running',
      animate: true,
    },
    success: {
      icon: CheckCircle2,
      variant: 'success',
      color: 'text-green-400',
      bg: isDark ? 'bg-green-900/20' : 'bg-green-50',
      border: 'border-green-500/30',
      barColor: 'bg-green-500',
      label: 'Success',
    },
    failed: {
      icon: XCircle,
      variant: 'danger',
      color: 'text-red-400',
      bg: isDark ? 'bg-red-900/20' : 'bg-red-50',
      border: 'border-red-500/30',
      barColor: 'bg-red-500',
      label: 'Failed',
    },
  };

  const config = statusConfig[stage] || statusConfig.idle;
  const Icon = config.icon;

  return (
    <div 
      className={`${config.bg} ${config.border} border rounded-xl p-4 mb-6 transition-all duration-300`}
      role="status"
      aria-live={stage === 'running' ? 'polite' : 'off'}
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
        <Badge variant={config.variant}>{config.label}</Badge>
        {stage === 'running' && progress > 0 && (
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {progress}%
          </span>
        )}
        {connectionState === 'error' && (
          <span className="text-xs text-amber-500">(Reconnecting...)</span>
        )}
      </div>
      
      <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-2`}>
        {message}
      </p>
      
      {stage === 'running' && (
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${config.barColor} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default PipelineStatus;
