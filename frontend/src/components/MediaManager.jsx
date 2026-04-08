import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, ExternalLink, RefreshCw, Filter, Trash2, Video, FileText, Send, Sparkles, Wand2 } from 'lucide-react';
import Skeleton from './Skeleton';
import { useToastContext } from '../hooks/useToast';
import Select from './ui/Select';

export default function MediaGallery() {
    const toast = useToastContext();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [stories, setStories] = useState([]);
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [imagePrompt, setImagePrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [activeTab, setActiveTab] = useState('gallery');

    const fetchAllAssets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/media/assets/all');
            const data = await res.json();
            if (res.ok) {
                setAssets(data.assets || []);
            }
        } catch (err) {
            console.error("Failed to fetch all assets", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStories = async () => {
        try {
            const res = await fetch('/api/stories?limit=all');
            const data = await res.json();
            if (res.ok) {
                setStories(data);
            }
        } catch (err) {
            console.error("Failed to fetch stories", err);
        }
    };

    useEffect(() => {
        fetchAllAssets();
        fetchStories();
    }, []);

    const handleGenerateImage = async () => {
        if (!selectedStoryId || !imagePrompt) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/media/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article_id: selectedStoryId, prompt: imagePrompt })
            });
            if (res.ok) {
                toast.success('Image generated successfully!');
                await fetchAllAssets();
                setActiveTab('gallery');
                setImagePrompt('');
            } else {
                toast.error('Failed to generate image');
            }
        } catch (err) {
            console.error("Image generation failed", err);
            toast.error('Image generation failed: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleGenerateVideoScript = async (platform) => {
        if (!selectedStoryId) return;
        setIsGenerating(true);
        try {
            const res = await fetch('/api/media/generate-video-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ article_id: selectedStoryId, platform })
            });
            if (res.ok) {
                toast.success(`${platform} script generated successfully!`);
                await fetchAllAssets();
                setActiveTab('gallery');
                setFilter('video_script');
            } else {
                toast.error(`Failed to generate ${platform} script`);
            }
        } catch (err) {
            console.error("Video script generation failed", err);
            toast.error('Script generation failed: ' + err.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const filteredAssets = filter === 'all'
        ? assets
        : assets.filter(item => item.asset_type === filter);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Media Manager</h2>
                    <p className="text-gray-500 text-sm">Create and manage visual assets & video scripts</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab('gallery')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'gallery' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Gallery
                        </button>
                        <button
                            onClick={() => setActiveTab('generate')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'generate' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            Generate
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === 'generate' ? (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 max-w-2xl mx-auto">
                    <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Create New Media Asset
                    </h3>

                    <div className="space-y-6">
                        <Select
                            id="story-select"
                            label="Select Story"
                            value={selectedStoryId}
                            onChange={(e) => setSelectedStoryId(e.target.value)}
                            options={[
                                { value: '', label: '-- Choose a story --' },
                                ...stories.map(s => ({ value: s.id, label: s.title }))
                            ]}
                            fullWidth
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4 text-purple-600" />
                                    AI Featured Image
                                </h4>
                                <textarea
                                    id="image-prompt"
                                    placeholder="Enter image prompt (e.g. A futuristic robot reading a newspaper...)"
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    className="w-full h-24 border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 resize-none"
                                    aria-label="Enter image generation prompt"
                                />
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={isGenerating || !selectedStoryId || !imagePrompt}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    aria-label="Generate AI image from prompt"
                                >
                                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    Generate Image
                                </button>
                            </div>

                            <div className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex flex-column">
                                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <Video className="w-4 h-4 text-orange-600" />
                                    Short-form Script
                                </h4>
                                <p className="text-xs text-gray-500 mb-4">Generate 60s viral scripts for social video platforms.</p>
                                <div className="space-y-2 mt-auto">
                                    {['tiktok', 'reels', 'shorts'].map(platform => (
                                        <button
                                            key={platform}
                                            onClick={() => handleGenerateVideoScript(platform)}
                                            disabled={isGenerating || !selectedStoryId}
                                            className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 capitalize"
                                        >
                                            Generate {platform} Script
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                All Assets
                            </button>
                            <button
                                onClick={() => setFilter('image')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'image' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Images
                            </button>
                            <button
                                onClick={() => setFilter('video_script')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === 'video_script' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                Video Scripts
                            </button>
                        </div>
                        <button
                            onClick={fetchAllAssets}
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
                            title="Refresh Assets"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            <Skeleton variant="card" count={8} />
                        </div>
                    ) : filteredAssets.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No assets found</h3>
                            <p className="text-gray-500 mt-1">Generate some visual assets or scripts to see them here.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredAssets.map((asset) => (
                                <div key={`${asset.asset_type}-${asset.id}`} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    {asset.asset_type === 'image' ? (
                                        <div className="aspect-video overflow-hidden bg-gray-100">
                                            <img
                                                src={asset.image_url}
                                                alt={asset.prompt || asset.article_title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        </div>
                                    ) : (
                                        <div className="aspect-video bg-indigo-50 flex items-center justify-center p-6 text-center">
                                            <div>
                                                <Video className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{asset.platform} SCRIPT</span>
                                            </div>
                                        </div>
                                    )}
                                    <div className="p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${asset.asset_type === 'image' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                {asset.asset_type === 'image' ? 'AI Image' : asset.platform}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{new Date(asset.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-xs font-semibold text-gray-900 line-clamp-1 mb-1">{asset.article_title}</h4>
                                        {asset.asset_type === 'image' ? (
                                            asset.prompt && <p className="text-[10px] text-gray-500 line-clamp-2 italic">"{asset.prompt}"</p>
                                        ) : (
                                            <p className="text-[10px] text-gray-500 line-clamp-2">"{asset.script_text}"</p>
                                        )}
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2">
                                        {asset.asset_type === 'image' ? (
                                            <a
                                                href={asset.image_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md transition-colors"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        ) : (
                                            <button
                                                onClick={() => alert(`Full Script:\n\n${asset.script_text}\n\nVisual Cues:\n${JSON.parse(asset.visual_cues || '[]').join('\n')}`)}
                                                className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white backdrop-blur-md transition-colors"
                                            >
                                                <FileText className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
