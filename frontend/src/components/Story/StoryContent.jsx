import React from 'react';
import { CheckCircle2, ThumbsUp, ThumbsDown, Sparkles, Calendar, Pencil, RefreshCw } from 'lucide-react';
import Badge from '../ui/Badge';
import CopyButton from '../CopyButton';

const StoryContent = ({ 
  platforms, 
  generatedContent, 
  qualityData, 
  qualityLoading, 
  recommendedHashtags,
  onTogglePosted,
  onQualityCheck,
  onSchedule,
  onEdit,
  onRegenerate,
  onFeedback,
  onLogEngagement,
  onOpenQualityDetail,
  getGradeColor
}) => {
  if (platforms.length === 0) {
    return (
      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <p className="text-gray-500 italic text-sm">No platforms selected or no posts generated for this story.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {platforms.map(platform => (
        <div key={platform} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 transition-colors">
          {/* Post Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm capitalize text-gray-800 tracking-tight">{platform}</span>
              {generatedContent[platform]?.posted && (
                <Badge variant="success" size="sm" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3" />
                  Posted
                </Badge>
              )}
              {qualityData[platform] && (
                <button 
                  onClick={() => onOpenQualityDetail(platform, qualityData[platform])}
                  className={`flex items-center gap-1 text-[10px] uppercase font-black border rounded-full px-2 py-0.5 transition-transform hover:scale-105 ${getGradeColor(qualityData[platform].grade)}`}
                >
                  Grade {qualityData[platform].grade}
                </button>
              )}
            </div>

            {generatedContent[platform] ? (
              <div className="flex gap-1.5 items-center">
                {/* Feedback Section */}
                <div className="flex items-center gap-0.5 mr-2 pr-2 border-r border-gray-200">
                  <button
                    onClick={() => onFeedback(platform, true)}
                    className="p-1.5 hover:bg-green-100 rounded-full text-gray-400 hover:text-green-600 transition-all active:scale-90"
                    title="Looks Great"
                  >
                    <ThumbsUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onFeedback(platform, false)}
                    className="p-1.5 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-600 transition-all active:scale-90"
                    title="Needs Improvement"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Actions Section */}
                <button 
                  onClick={() => onTogglePosted(platform)} 
                  className={`px-3 py-1 text-[11px] font-bold rounded-full border transition-all ${
                    generatedContent[platform]?.posted 
                      ? "bg-green-600 border-green-600 text-white shadow-sm" 
                      : "bg-white border-gray-300 text-gray-700 hover:border-blue-400"
                  }`}
                >
                  {generatedContent[platform]?.posted ? 'Undo' : 'Mark Posted'}
                </button>
                
                <div className="flex gap-0.5">
                  <ActionButton icon={Sparkles} onClick={() => onQualityCheck(platform, generatedContent[platform]?.text)} disabled={qualityLoading[platform]} title="Check Quality" />
                  <ActionButton icon={Calendar} onClick={() => onSchedule(platform)} title="Schedule" />
                  <ActionButton icon={Pencil} onClick={() => onEdit(platform)} title="Edit" />
                  <ActionButton icon={RefreshCw} onClick={() => onRegenerate(platform)} title="Regenerate" />
                  <CopyButton
                    text={generatedContent[platform]?.text || ''}
                    onCopy={() => onLogEngagement('copy', platform)}
                    size="sm"
                    className="p-1.5 hover:bg-blue-100 text-gray-500 hover:text-blue-600 rounded-full"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Generating...</span>
              </div>
            )}
          </div>

          {/* Post Content */}
          <div className="p-4">
            {generatedContent[platform] ? (
              <div className="space-y-4">
                <div className="whitespace-pre-wrap text-sm text-gray-800 font-medium leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100 shadow-inner">
                  {generatedContent[platform]?.text}
                </div>
                
                {Array.isArray(recommendedHashtags[platform]) && recommendedHashtags[platform].length > 0 && (
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Recommended Hashtags</div>
                      <CopyButton 
                        text={(recommendedHashtags[platform] || []).map(h => h.hashtag).join(' ')} 
                        size="xs"
                        variant="ghost"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(recommendedHashtags[platform] || []).map((h) => (
                        <span key={`rec-${platform}-${h.hashtag}`} className="px-2 py-0.5 bg-white text-blue-700 text-[10px] rounded-full font-bold border border-blue-200 shadow-sm">
                          {h.hashtag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-3">
                <div className="h-3 bg-gray-100 rounded-full w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded-full w-1/2"></div>
                <div className="h-3 bg-gray-100 rounded-full w-5/6"></div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const ActionButton = ({ icon: Icon, onClick, disabled, title }) => (
  <button 
    onClick={onClick} 
    disabled={disabled}
    className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 hover:text-blue-600 transition-all disabled:opacity-30 active:scale-95" 
    title={title}
  >
    <Icon className="w-3.5 h-3.5" />
  </button>
);

export default StoryContent;
