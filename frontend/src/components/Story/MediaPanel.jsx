import React, { useState } from 'react';
import { Image, Music, Loader2, ExternalLink, X } from 'lucide-react';

/**
 * MediaPanel Component
 * Displays media assets and audio (read-only view)
 * Generation buttons are in the Content Generation section
 * 
 * @param {Object} props
 * @param {Array} props.media - Media assets array
 * @param {boolean} props.mediaLoading - Media loading state
 * @param {Array} props.audioAssets - Audio assets array
 * @param {boolean} props.audioLoading - Audio loading state
 */
const MediaPanel = ({
  media,
  mediaLoading,
  audioAssets,
  audioLoading,
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  
  console.log('MediaPanel received props:', { 
    media, 
    mediaCount: media?.length, 
    audioAssets, 
    audioCount: audioAssets?.length,
    mediaLoading,
    audioLoading
  });
  
  const hasMedia = media && media.length > 0;
  const hasAudio = audioAssets && audioAssets.length > 0;
  
  console.log('MediaPanel computed:', { hasMedia, hasAudio });

  return (
    <div className="space-y-6">
      {/* Media Assets Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Media Assets</h3>
            <p className="text-xs text-gray-500">{hasMedia ? `${media.length} images` : 'No images generated'}</p>
          </div>
        </div>

        {/* Media Grid */}
        {mediaLoading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span className="text-sm">Loading media...</span>
          </div>
        ) : hasMedia ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((item, idx) => {
              const imageUrl = item.image_url || item.local_path || item.url || item.thumbnail;
              const isQuoteCard = item.media_type === 'quote-card' || item.prompt?.includes('quote');
              
              return (
                <div 
                  key={idx} 
                  className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border-2 border-gray-200 hover:border-pink-400 transition-all hover:shadow-lg"
                  onClick={() => setSelectedImage(item)}
                >
                  <img 
                    src={imageUrl}
                    alt={item.prompt || item.alt || `Asset ${idx + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="text-center text-white">
                      <ExternalLink className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-xs font-medium">View Full Size</span>
                    </div>
                  </div>
                  {isQuoteCard && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded-full">
                      QUOTE
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No media assets yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate images or quote cards</p>
          </div>
        )}
      </div>

      {/* Podcast Section */}
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Music className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Podcast</h3>
            <p className="text-xs text-gray-500">{hasAudio ? `${audioAssets.length} episodes` : 'No podcast generated'}</p>
          </div>
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
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {audio.title || audio.voice || `Podcast Episode ${idx + 1}`}
                  </p>
                  <p className="text-xs text-gray-500">{audio.duration || 'Unknown duration'}</p>
                </div>
                <a 
                  href={audio.url || audio.local_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Music className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
            <Music className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No podcast content yet</p>
            <p className="text-xs text-gray-400 mt-1">Generate podcast for audio distribution</p>
          </div>
        )}
      </div>

      {/* Full Size Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img 
              src={selectedImage.image_url || selectedImage.local_path || selectedImage.url}
              alt={selectedImage.prompt || 'Media asset'}
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {selectedImage.prompt && (
              <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-sm text-white/80">{selectedImage.prompt}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaPanel;
