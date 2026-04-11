import React, { useState, useEffect } from 'react';
import { Mic, RefreshCw, Sparkles, Activity, Calendar, Headphones } from 'lucide-react';
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
        <div className="max-w-5xl mx-auto py-12 px-6">
            <div className="glass-morphism rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden relative">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="p-10 bg-gradient-to-br from-indigo-900/60 to-slate-900/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5">
                        <Mic size={240} />
                    </div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 backdrop-blur-md">
                                    <Headphones className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight">Daily AI <span className="text-indigo-400">Pulse</span></h2>
                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">AI Synthesis Pipeline v2.0</p>
                                </div>
                            </div>
                            <p className="text-slate-300 text-lg max-w-2xl font-medium leading-relaxed">
                                Experience the top 5 AI breakthroughs of the day, condensed into a professional audio briefing for high-performance operators.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-10">
                    {loading ? (
                        <div className="space-y-6 animate-pulse">
                            <div className="h-24 bg-white/5 rounded-[2rem]" />
                            <div className="h-48 bg-white/5 rounded-[2rem]" />
                        </div>
                    ) : latestPodcast ? (
                        <div className="space-y-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-white/5">
                                <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <Calendar className="w-4 h-4 text-indigo-500" />
                                    <span>Latest Transmission: {new Date(latestPodcast.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                                <button
                                    onClick={generatePodcast}
                                    disabled={generating}
                                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-all bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                                    {generating ? 'Regenerating...' : 'Regenerate Digest'}
                                </button>
                            </div>

                            <AudioPlayer 
                                url={latestPodcast.audio_url} 
                                title={`Pulse Digest - ${new Date(latestPodcast.created_at).toLocaleDateString()}`} 
                            />

                            <div className="bg-white/5 rounded-[2rem] p-8 border border-white/5 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-indigo-500/[0.02] translate-y-full group-hover:translate-y-0 transition-transform duration-700" />
                                <h3 className="font-black text-white mb-4 flex items-center gap-3 uppercase text-xs tracking-[0.2em] relative z-10">
                                    <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                                    Debate Mode Intelligence
                                </h3>
                                <p className="text-sm text-slate-400 leading-relaxed font-medium relative z-10">
                                    Today's synthesis features a technical debate between **Alex** (Strategic Visionary) and **Morgan** (Pragmatic Skeptic). They break down cross-modal reasoning and LLM efficiency, balancing breakthrough innovation with real-world deployment hurdles.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 px-8">
                            <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-inner">
                                <Activity className="w-10 h-10 text-slate-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">No Digest Synthesized</h3>
                            <p className="text-slate-400 mb-10 max-w-sm mx-auto text-sm leading-relaxed">
                                Your AI news pipeline is ready. Trigger the first synthesis to generate today's briefing.
                            </p>
                            <button
                                onClick={generatePodcast}
                                disabled={generating}
                                className="inline-flex items-center gap-3 px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest transition-all shadow-2xl shadow-indigo-600/20 transform active:scale-95"
                            >
                                {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                                Initialize Digest Synthesis
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PodcastView;
