import React, { useState, useEffect } from 'react';
import { Mic, RefreshCw, Sparkles, Activity, Calendar, Headphones, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

const PodcastView = () => {
    const [latestPodcast, setLatestPodcast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [stories, setStories] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showSelector, setShowSelector] = useState(false);

    const fetchLatest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/podcast/latest');
            const data = await res.json();
            if (res.ok) setLatestPodcast(data.podcast);
        } catch (err) {
            console.error('Failed to fetch latest podcast', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStories = async () => {
        try {
            const res = await fetch('/api/stories?limit=20&sort=score');
            const data = await res.json();
            if (res.ok) setStories(Array.isArray(data) ? data : (data.stories || []));
        } catch (err) {
            console.error('Failed to fetch stories', err);
        }
    };

    useEffect(() => {
        fetchLatest();
        fetchStories();
    }, []);

    const toggleStory = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const generatePodcast = async () => {
        setGenerating(true);
        try {
            const body = selectedIds.length > 0
                ? { article_ids: selectedIds }
                : { limit: 5 };
            const res = await fetch('/api/generate/podcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (res.ok) {
                await fetchLatest();
                setShowSelector(false);
            } else {
                alert(data.error || 'Podcast generation failed');
            }
        } catch (err) {
            alert('Failed to trigger podcast generation');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-12 px-6">
            <div className="glass-morphism rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

                {/* Header */}
                <div className="p-10 bg-gradient-to-br from-indigo-900/60 to-slate-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <Mic size={240} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                                <Headphones className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">
                                    Daily AI <span className="text-indigo-400">Pulse</span>
                                </h2>
                                <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">
                                    AI Synthesis Pipeline v2.0
                                </p>
                            </div>
                        </div>
                        <p className="text-slate-300 text-lg max-w-2xl font-medium leading-relaxed">
                            Select articles to include, or use the top 5 by score. Generates a conversational
                            Alex vs Morgan debate script and converts it to audio.
                        </p>
                    </div>
                </div>

                <div className="p-10 space-y-8">
                    {/* Article Selector */}
                    <div className="rounded-2xl border border-white/10 overflow-hidden">
                        <button
                            onClick={() => setShowSelector(s => !s)}
                            className="w-full flex items-center justify-between px-6 py-4 bg-white/5 hover:bg-white/10 transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm font-bold text-white uppercase tracking-widest">
                                    {selectedIds.length > 0
                                        ? `${selectedIds.length} article${selectedIds.length > 1 ? 's' : ''} selected`
                                        : 'Select articles (optional — defaults to top 5)'}
                                </span>
                            </div>
                            {showSelector
                                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                                : <ChevronDown className="w-4 h-4 text-slate-400" />
                            }
                        </button>

                        {showSelector && (
                            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
                                {stories.length === 0 ? (
                                    <p className="px-6 py-4 text-sm text-slate-500">No stories available yet — run the pipeline first.</p>
                                ) : (
                                    stories.map(story => {
                                        const selected = selectedIds.includes(story.id);
                                        return (
                                            <button
                                                key={story.id}
                                                onClick={() => toggleStory(story.id)}
                                                className={`w-full flex items-start gap-3 px-6 py-3 text-left transition-colors ${selected ? 'bg-indigo-600/10' : 'hover:bg-white/5'}`}
                                            >
                                                {selected
                                                    ? <CheckSquare className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                                                    : <Square className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
                                                }
                                                <div className="min-w-0">
                                                    <p className={`text-sm font-medium truncate ${selected ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                        {story.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {story.source} · Score {story.total_score ?? story.viral_score ?? '—'}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    {/* Generate Button */}
                    <div className="flex justify-center">
                        <button
                            onClick={generatePodcast}
                            disabled={generating}
                            className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all shadow-2xl shadow-indigo-600/20 active:scale-95"
                        >
                            {generating
                                ? <RefreshCw className="w-5 h-5 animate-spin" />
                                : <Mic className="w-5 h-5" />
                            }
                            {generating ? 'Generating…' : 'Generate Podcast'}
                        </button>
                    </div>

                    {/* Latest Podcast */}
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-20 bg-white/5 rounded-2xl" />
                        </div>
                    ) : latestPodcast ? (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest border-t border-white/5 pt-6">
                                <Calendar className="w-4 h-4 text-indigo-500" />
                                <span>
                                    Latest: {new Date(latestPodcast.created_at).toLocaleDateString(undefined, {
                                        month: 'long', day: 'numeric', year: 'numeric'
                                    })}
                                </span>
                            </div>
                            <AudioPlayer
                                url={latestPodcast.audio_url}
                                title={`Pulse Digest — ${new Date(latestPodcast.created_at).toLocaleDateString()}`}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No digest generated yet. Select articles above and click Generate.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastView;
