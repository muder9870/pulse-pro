import React from 'react';
import { RefreshCw, Edit3, CheckCircle, XCircle, Sparkles, Calendar, Send } from 'lucide-react';
import Button from '../ui/Button';

/**
 * ContentEditor Component
 * Handles content editing, regeneration, and feedback for a specific platform
 * 
 * @param {Object} props
 * @param {string} props.platform - Platform name (twitter, linkedin, etc.)
 * @param {Object} props.content - Generated content { text, posted, posted_at }
 * @param {Object} props.qualityData - Quality check data
 * @param {boolean} props.qualityLoading - Quality check loading state
 * @param {Array} props.hashtags - Recommended hashtags
 * @param {Function} props.onTogglePosted - Toggle posted status
 * @param {Function} props.onQualityCheck - Trigger quality check
 * @param {Function} props.onEdit - Open edit modal
 * @param {Function} props.onRegenerate - Regenerate content
 * @param {Function} props.onFeedback - Send feedback
 * @param {Function} props.onLogEngagement - Log engagement
 * @param {Function} props.onOpenQualityDetail - Open quality detail modal
 * @param {Function} props.getGradeColor - Get grade color classes
 * @param {Function} props.onSchedule - Open schedule modal for this platform
 * @param {Function} props.onPostNow - Post now for this platform
 */
const ContentEditor = ({
  platform,
  content,
  qualityData,
  qualityLoading,
  hashtags,
  onTogglePosted,
  onQualityCheck,
  onEdit,
  onRegenerate,
  onFeedback,
  onLogEngagement,
  onOpenQualityDetail,
  getGradeColor,
  onSchedule,
  onPostNow,
}) => {
  const hasContent = content?.text && !content.text.startsWith('Error');
  const isPosted = content?.posted;
  const quality = qualityData?.[platform];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Platform Header */}
      <div className="px-5 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {platform.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-gray-900 capitalize">{platform}</span>
          {isPosted && (
            <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <CheckCircle className="w-3 h-3" />
              Posted
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Quality Check Button */}
          {hasContent && !quality && (
            <button
              onClick={() => { onQualityCheck(platform, content.text); onLogEngagement('quality_check', platform); }}
              disabled={qualityLoading}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Quality Check"
            >
              <Sparkles className={`w-4 h-4 ${qualityLoading ? 'animate-pulse' : ''}`} />
            </button>
          )}
          
          {/* Quality Grade Display */}
          {quality && (
            <button
              onClick={() => onOpenQualityDetail(platform, quality)}
              className={`px-3 py-1 rounded-lg text-sm font-bold border ${getGradeColor(quality.grade)}`}
            >
              {quality.grade}
            </button>
          )}
          
          {/* Edit Button */}
          <button
            onClick={() => { onEdit(platform); onLogEngagement('edit', platform); }}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Content"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          
          {/* Regenerate Button */}
          <button
            onClick={() => { onRegenerate(platform); onLogEngagement('regenerate', platform); }}
            className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          
          {/* Schedule Button */}
          {hasContent && (
            <button
              onClick={() => { onSchedule(platform); onLogEngagement('schedule', platform); }}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Schedule Post"
            >
              <Calendar className="w-4 h-4" />
            </button>
          )}
          
          {/* Post Now Button */}
          {hasContent && !isPosted && (
            <button
              onClick={() => { onPostNow(platform); onLogEngagement('post_now', platform); }}
              className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Post Now"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          
          {/* Posted Status Toggle */}
          <button
            onClick={() => onTogglePosted(platform)}
            className={`p-2 rounded-lg transition-colors ${isPosted ? 'text-green-600 bg-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
            title={isPosted ? 'Mark as not posted' : 'Mark as posted'}
          >
            <CheckCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Display */}
      <div className="p-5">
        {!hasContent ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Generating content...</span>
          </div>
        ) : content.text.startsWith('Error') ? (
          <div className="flex items-center gap-2 py-4 px-4 bg-red-50 text-red-600 rounded-xl">
            <XCircle className="w-5 h-5" />
            <span className="text-sm">{content.text}</span>
          </div>
        ) : (
          <>
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{content.text}</p>
            
            {/* Hashtags */}
            {hashtags && hashtags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hashtags.slice(0, 5).map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            
            {/* Feedback Buttons */}
            <div className="mt-4 flex items-center gap-2 pt-4 border-t border-gray-100">
              <span className="text-xs text-gray-500">Was this helpful?</span>
              <button
                onClick={() => onFeedback(platform, true)}
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Good content"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => onFeedback(platform, false)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Needs improvement"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ContentEditor;
