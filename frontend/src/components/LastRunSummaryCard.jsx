import React from 'react';
import { Clock, FileText, CheckCircle, Zap, RefreshCw } from 'lucide-react';

/**
 * LastRunSummaryCard Component
 * Shows a summary of the last pipeline run at-a-glance
 * Visible without opening the pipeline panel
 * 
 * @param {Object} props
 * @param {Object} props.lastRun - Last run data from API
 * @param {string} props.lastRun.timestamp - ISO timestamp of last run
 * @param {number} props.lastRun.articlesFetched - Number of articles fetched
 * @param {number} props.lastRun.contentGenerated - Number of content pieces generated
 * @param {string} props.lastRun.status - Status: 'success' | 'partial' | 'failed'
 * @param {string} props.lastRun.duration - Duration string (e.g., '2m 34s')
 */
const LastRunSummaryCard = ({ lastRun }) => {
  if (!lastRun) return null;

  const {
    timestamp,
    articlesFetched = 0,
    contentGenerated = 0,
    status = 'success',
    duration,
  } = lastRun;

  // Format relative time
  const getRelativeTime = (isoString) => {
    if (!isoString) return 'Unknown';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Status styles
  const statusConfig = {
    success: {
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      label: 'Success',
    },
    partial: {
      icon: RefreshCw,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      label: 'Partial',
    },
    failed: {
      icon: Zap,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      label: 'Failed',
    },
  };

  const config = statusConfig[status] || statusConfig.success;
  const StatusIcon = config.icon;

  return (
    <div className={`rounded-xl p-4 border ${config.borderColor} ${config.bgColor} backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${config.color}`} />
          <h3 className="text-sm font-semibold text-slate-200">
            Last Run Summary
          </h3>
        </div>
        <span className={`text-xs font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Time */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Time</span>
          </div>
          <p className="text-sm font-medium text-slate-200">
            {getRelativeTime(timestamp)}
          </p>
          {duration && (
            <p className="text-[10px] text-slate-500">{duration}</p>
          )}
        </div>

        {/* Articles */}
        <div className="text-center border-x border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <FileText className="w-3 h-3" />
            <span className="text-xs">Articles</span>
          </div>
          <p className="text-sm font-medium text-slate-200">
            {articlesFetched.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">fetched</p>
        </div>

        {/* Content */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
            <Zap className="w-3 h-3" />
            <span className="text-xs">Content</span>
          </div>
          <p className="text-sm font-medium text-slate-200">
            {contentGenerated.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-500">generated</p>
        </div>
      </div>
    </div>
  );
};

export default LastRunSummaryCard;
