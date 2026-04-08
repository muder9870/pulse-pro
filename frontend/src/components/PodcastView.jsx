import React, { useState, useEffect } from 'react';
import { Mic, RefreshCw, Play, Volume2, Calendar, Sparkles, Activity } from 'lucide-react';
import AudioPlayer from './AudioPlayer';

const PodcastView = () => {
    const [latestPodcast, setLatestPodcast] = useState(null);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    const fetchLatest = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/podcast/latest');
            const data = await res.json();
            if (res.ok) {
                setLatestPodcast(data.podcast);
            }
        } catch (err) {
            console.error("Failed to fetch latest podcast", err);
        } finally {
            setLoading(false);
        }
    };

    const generatePodcast = async () => {
        setGenerating(true);
        try {
            const res = await fetch('/api/generate/podcast', { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                fetchLatest();
            } else {
                alert(data.error || "Podcast generation failed");
            }
        } catch (err) {
            console.error("Failed to trigger podcast generation", err);
            alert("Failed to trigger podcast generation");
        } finally {
            setGenerating(false);
        }
    };

    useEffect(() => {
        fetchLatest();
    }, []);

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-8 bg-gradient-to-br from-purple-600 to-blue-700 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Mic size={120} />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/20 rounded-lg backdrop-blur-md">
                                <Mic className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">Daily AI Pulse</h2>
                                <p className="text-blue-100">AI-Synthesized Morning Digest</p>
                            </div>
                        </div>
                        <p className="text-lg opacity-90 max-w-2xl">
                            Listen to the top 5 AI stories of the day, summarized and narrated by your custom AI host.
                        </p>
                    </div>
                </div>

                <div className="p-8">
                    {loading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-12 bg-slate-100 rounded-xl w-3/4" />
                            <div className="h-16 bg-slate-100 rounded-xl" />
                            <div className="h-32 bg-slate-100 rounded-xl" />
                        </div>
                    ) : latestPodcast ? (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    <span>Latest Episode: {new Date(latestPodcast.created_at).toLocaleDateString()}</span>
                                </div>
                                <button
                                    onClick={generatePodcast}
                                    disabled={generating}
                                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                    <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                                    Regenerate Digest
                                </button>
                            </div>

                            <AudioPlayer url={latestPodcast.audio_url} title={`Daily AI Pulse - ${new Date(latestPodcast.created_at).toLocaleDateString()}`} />

                            <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-600" />
                                    What's in this episode?
                                </h3>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    This AI-generated podcast covers today's highest-scoring developments in computer vision, large language models, and AI research. We've compiled the core takeaways so you can stay informed while on the go.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Activity className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Digest Generated Yet</h3>
                            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                                Ready to hear what happened in AI today? Generate your first "Daily AI Pulse" podcast now.
                            </p>
                            <button
                                onClick={generatePodcast}
                                disabled={generating}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md shadow-blue-200"
                            >
                                {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                Generate My First Digest
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastView;
