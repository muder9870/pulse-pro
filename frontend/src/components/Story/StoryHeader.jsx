import React, { useState } from 'react';
import { ExternalLink, Calendar, MoreVertical, Edit, Trash2, Share2, Copy } from 'lucide-react';
import { Button } from '../ui/Button';
import Badge from '../ui/Badge';

/**
 * StoryHeader Component
 * 
 * Story card header with title hierarchy and actions menu.
 * 
 * @param {Object} props
 * @param {Object} props.story - Story data object
 * @param {Array} props.tags - Story tags
 * @param {Array} props.hashtags - Story hashtags
 * @param {Function} props.onEdit - Edit handler
 * @param {Function} props.onDelete - Delete handler
 * @param {Function} props.onShare - Share handler
 * @param {Function} props.onCopy - Copy handler
 */
const StoryHeader = ({ 
  story, 
  tags = [], 
  hashtags = [],
  onEdit,
  onDelete,
  onShare,
  onCopy,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const actions = [
    { id: 'edit', label: 'Edit', icon: Edit, onClick: onEdit },
    { id: 'copy', label: 'Copy Link', icon: Copy, onClick: onCopy },
    { id: 'share', label: 'Share', icon: Share2, onClick: onShare },
    { id: 'delete', label: 'Delete', icon: Trash2, onClick: onDelete, danger: true },
  ].filter(a => a.onClick);

  return (
    <div className="flex-1">
      {/* Source + Date row - H4 level */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:scale-110 transition-transform cursor-help group/source relative">
          {(story.source || '?').charAt(0).toUpperCase()}
          {/* Source Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900/90 text-[10px] text-white rounded opacity-0 group-hover/source:opacity-100 transition-opacity whitespace-nowrap z-30 pointer-events-none">
            Original Source: {story.source}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">{story.source || 'Unknown'}</div>
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(story.fetched_at).toLocaleDateString()}
          </div>
        </div>
        
        {/* Actions menu */}
        {actions.length > 0 && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Story actions"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
                      action.onClick();
                      setIsMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 ${
                      action.danger ? 'text-red-600' : 'text-gray-700'
                    }`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="relative group/priority">
          {story.priority === 'HIGH' && (
            <Badge variant="danger" size="xs" className="ml-auto animate-pulse cursor-help">
              HIGH PRIORITY
            </Badge>
          )}
          <div className="absolute top-full right-0 mt-1 px-2 py-1 bg-red-600 text-[9px] text-white rounded-md opacity-0 group-hover/priority:opacity-100 transition-opacity whitespace-nowrap z-30 font-bold pointer-events-none shadow-lg">
            This story has high viral/tech significance
          </div>
        </div>
      </div>

      {/* Title - H3 for card context with proper hierarchy */}
      <h3 className="text-xl font-bold text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {story.title}
          <ExternalLink className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
      </h3>

      {/* Summary - body text */}
      <p className="text-gray-600 text-base leading-relaxed mb-4 line-clamp-3">
        {story.summary}
      </p>

      {/* Tags & Hashtags */}
      {(tags.length > 0 || hashtags.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.slice(0, 3).map((t) => (
            <span key={`tag-${t}`} className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium hover:bg-gray-200 transition-colors cursor-pointer">
              {t}
            </span>
          ))}
          {hashtags.slice(0, 3).map((h) => (
            <span key={`hash-${h}`} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">
              {h}
            </span>
          ))}
          {(tags.length + hashtags.length > 6) && (
            <span className="px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
              +{tags.length + hashtags.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StoryHeader;
