import React from 'react';
import { Calendar, Share2, Globe, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import PlatformSelector from '../PlatformSelector';

/**
 * PublishPanel Component
 * Handles platform selection and publishing actions
 * 
 * @param {Object} props
 * @param {Array} props.platforms - Selected platforms
 * @param {Function} props.onChange - Platform selection change handler
 * @param {Function} props.onSchedule - Schedule action handler
 * @param {Function} props.onPublishNow - Publish now handler
 * @param {Function} props.onGenerate - Generate action handler
 * @param {number} props.contentCount - Number of generated content pieces
 * @param {boolean} props.hasValidContent - Whether all platforms have valid content
 * @param {boolean} props.isGenerating - Whether content generation is in progress
 */
const PublishPanel = ({
  platforms,
  onChange,
  onSchedule,
  onPublishNow,
  onGenerate,
  contentCount = 0,
  hasValidContent = false,
  isGenerating = false,
}) => {
  return (
    <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 shadow-xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Publishing Hub</h3>
          <p className="text-xs text-gray-500">Select platforms and manage content generation</p>
        </div>
      </div>

      {/* Platform Selector */}
      <div className="mb-5">
        <PlatformSelector selected={platforms} onChange={onChange} />
      </div>

      {/* Status Summary */}
      <div className="flex items-center gap-2 mb-5 p-3 bg-gray-50 rounded-xl">
        <div className={`w-2 h-2 rounded-full ${hasValidContent ? 'bg-green-500' : 'bg-amber-500'}`} />
        <span className="text-sm text-gray-600">
          {contentCount} of {platforms.length} platforms ready
        </span>
        {!hasValidContent && platforms.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-amber-600 ml-auto">
            <AlertCircle className="w-3 h-3" />
            Generate content to proceed
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onGenerate}
          disabled={isGenerating || platforms.length === 0}
          className={`flex items-center justify-center gap-2 px-4 py-3 border rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            hasValidContent 
              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' 
              : 'bg-indigo-600 text-white border-transparent hover:shadow-lg hover:shadow-indigo-500/25'
          }`}
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {hasValidContent ? 'Regenerate' : 'Generate Content'}
        </button>

        <button
          onClick={onSchedule}
          disabled={!hasValidContent || platforms.length === 0 || isGenerating}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Calendar className="w-4 h-4" />
          Schedule
        </button>
        
        <button
          onClick={onPublishNow}
          disabled={!hasValidContent || platforms.length === 0 || isGenerating}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Share2 className="w-4 h-4" />
          Publish Now
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] text-center mt-4">
        Tailor your narrative across the digital ecosystem
      </p>
    </div>
  );
};

export default PublishPanel;
