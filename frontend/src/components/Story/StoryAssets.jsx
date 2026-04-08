import React from 'react';
import { ImageIcon, Volume2, Sparkles, Plus } from 'lucide-react';
import Button from '../ui/Button';
import AudioPlayer from '../AudioPlayer';

const StoryAssets = ({ 
  media, 
  mediaLoading, 
  audioAssets, 
  audioLoading, 
  onGenerateImage, 
  onGenerateQuoteCard, 
  onGenerateAudio 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Media Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-sm text-gray-800">Visual Assets</span>
          </div>
          <div className="flex gap-1">
            <Button onClick={onGenerateImage} disabled={mediaLoading} loading={mediaLoading} variant="ghost" size="xs" icon={Sparkles}>AI Image</Button>
            <Button onClick={onGenerateQuoteCard} disabled={mediaLoading} loading={mediaLoading} variant="ghost" size="xs" icon={Plus}>Quote Card</Button>
          </div>
        </div>
        <div className="p-4">
          {media.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm group relative">
                  <img src={item.url} alt={`Asset ${i}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-full text-gray-900 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Sparkles className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-medium">No visual assets yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Audio Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-purple-500" />
            <span className="font-bold text-sm text-gray-800">Audio Experience</span>
          </div>
          <Button onClick={onGenerateAudio} disabled={audioLoading} loading={audioLoading} variant="ghost" size="xs" icon={Sparkles}>Generate</Button>
        </div>
        <div className="p-4">
          {audioAssets.length > 0 ? (
            <div className="space-y-3">
              {audioAssets.map((audio, i) => (
                <AudioPlayer key={i} src={audio.url} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Volume2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-xs text-gray-400 font-medium">No audio generated yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryAssets;
