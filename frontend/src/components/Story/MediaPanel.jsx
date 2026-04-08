import React from 'react';
import { Image, Music, FileText, Plus, Loader2, ExternalLink } from 'lucide-react';
import Button from '../ui/Button';

/**
 * MediaPanel Component
 * Handles media assets, audio generation, and blog publishing
 * 
 * @param {Object} props
 * @param {Array} props.media - Media assets array
 * @param {boolean} props.mediaLoading - Media loading state
 * @param {Array} props.audioAssets - Audio assets array
 * @param {boolean} props.audioLoading - Audio loading state
 * @param {Function} props.onGenerateImage - Image generation handler
 * @param {Function} props.onGenerateQuoteCard - Quote card generation handler
 * @param {Function} props.onGenerateAudio - Audio generation handler
 * @param {Function} props.onOpenBlogPublisher - Blog publisher open handler
 */
const MediaPanel = ({
  media,
  mediaLoading,
  audioAssets,
  audioLoading,
  onGenerateImage,
  onGenerateQuoteCard,
  onGenerateAudio,
  onOpenBlogPublisher,
}) => {
  const hasMedia = media && media.length > 0;
  const hasAudio = audioAssets && audioAssets.length > 0;

  return (
    <div className="space-y-6">
      {/* Visual Assets Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Image className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Visual Assets</h3>
              <p className="text-xs text-gray-500">{hasMedia ? `${media.length} images` : 'No images generated'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onGenerateQuoteCard}
              variant="secondary"
              size="sm"
              icon={Plus}
            >
              Quote Card
            </Button>
            <Button
              onClick={onGenerateImage}
              variant="primary"
              size="sm"
              icon={Plus}
            >
              AI Image
            </Button>
          </div>
        </div>

        {/* Media Grid */}
        {mediaLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Loading media...</span>
          </div>
        ) : hasMedia ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {media.map((item, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-gray-200 hover:border-pink-400 transition-colors">
                <img 
                  src={item.url || item.thumbnail} 
                  alt={item.alt || `Asset ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No visual assets yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate images or quote cards</p>
          </div>
        )}
      </div>

      {/* Audio Assets Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Audio Content</h3>
              <p className="text-xs text-gray-500">{hasAudio ? `${audioAssets.length} tracks` : 'No audio generated'}</p>
            </div>
          </div>
          
          <Button
            onClick={onGenerateAudio}
            variant="secondary"
            size="sm"
            icon={audioLoading ? Loader2 : Plus}
            disabled={audioLoading}
          >
            {audioLoading ? 'Generating...' : 'Generate Audio'}
          </Button>
        </div>

        {/* Audio List */}
        {hasAudio ? (
          <div className="space-y-2">
            {audioAssets.map((audio, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{audio.title || `Audio Track ${idx + 1}`}</p>
                  <p className="text-xs text-gray-500">{audio.duration || 'Unknown duration'}</p>
                </div>
                <button className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                  <Music className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
            <Music className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No audio content yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate audio for podcast or social clips</p>
          </div>
        )}
      </div>

      {/* Blog Publishing Section */}
      <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 backdrop-blur-xl rounded-2xl border border-indigo-200/50 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Long-Form Blog</h3>
              <p className="text-xs text-gray-500">Publish to your connected blog platform</p>
            </div>
          </div>
          
          <Button
            onClick={onOpenBlogPublisher}
            variant="primary"
            size="md"
            icon={FileText}
          >
            Open Editor
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MediaPanel;
