import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, Target, BrainCircuit, ChevronRight } from 'lucide-react';
import { Button, Badge, Spinner } from './ui';

/**
 * DailyIntelligence Component
 * Displays the top 3 high-impact AI stories from the Decision Engine.
/**
 * DailyIntelligence Component
 * Displays the top 3 high-impact AI stories from the Decision Engine.
 * Features ultra-modern premium aesthetics and impact scoring.
 */
const DailyIntelligence = ({ onRunPipeline, activeTheme }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/intelligence/daily')
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    setData(res.data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to fetch intelligence summary:', err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className={`animate-pulse backdrop-blur-xl rounded-3xl p-8 mb-10 border shadow-2xl relative overflow-hidden ${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-gray-100 border-gray-300'}`}>
            <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer ${activeTheme === 'dark' ? '' : 'via-gray-200'}`} style={{ backgroundSize: '200% 100%' }}></div>
            <div className="flex items-center justify-center py-12">
                <Spinner size="lg" variant="primary" />
            </div>
        </div>
    );

    if (!data || !data.stories || data.stories.length === 0) {
        return (
            <div className={`backdrop-blur-xl rounded-3xl p-8 mb-10 border shadow-2xl relative overflow-hidden ${activeTheme === 'dark' ? 'bg-slate-900/40 border-white/10' : 'bg-gray-100 border-gray-300'}`}>
                <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none ${activeTheme === 'dark' ? 'bg-indigo-600/5' : 'bg-indigo-200/10'}`}></div>
                <div className="relative z-10 text-center py-12">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-6 ${activeTheme === 'dark' ? 'bg-slate-800/50 border-white/10' : 'bg-gray-200 border-gray-300'}`}>
                        <Sparkles className={`w-8 h-8 ${activeTheme === 'dark' ? 'text-slate-500' : 'text-gray-600'}`} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-3 ${activeTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        Daily Intelligence Pending
                    </h3>
                    <p className={`text-sm max-w-md mx-auto mb-6 ${activeTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                        The AI Decision Engine hasn't generated today's intelligence brief yet. Run the pipeline to analyze and prioritize the latest AI news.
                    </p>
                    <Button 
                        variant="primary"
                        onClick={() => {
                            if (onRunPipeline) {
                                onRunPipeline();
                            } else {
                                fetch('/api/pipeline/run', {method: 'POST'})
                                    .then(res => res.json())
                                    .then(data => {
                                        if (data.status === 'started' || data.status === 'running') {
                                            alert('Pipeline started! This will take 20-30 minutes. The page will refresh automatically when complete.');
                                        }
                                    })
                                    .catch(err => console.error('Failed to start pipeline:', err));
                            }
                        }}
                        className="inline-flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                    >
                        <BrainCircuit className="w-4 h-4" />
                        Generate Intelligence
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`glass-morphism rounded-[2.5rem] p-10 mb-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] relative overflow-hidden group border ${activeTheme === 'dark' ? 'border-white/10' : 'border-gray-300'}`}>
            {/* Background Texture & Glows */}
            <div className={`absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/4 ${activeTheme === 'dark' ? 'bg-indigo-600/10' : 'bg-indigo-200/10'}`}></div>
            <div className={`absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/4 ${activeTheme === 'dark' ? 'bg-purple-600/10' : 'bg-purple-200/10'}`}></div>

            <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant="info" className="text-[10px] uppercase tracking-widest">
                                AI Intelligence layer
                            </Badge>
                            <div className="h-px w-8 bg-indigo-500/20"></div>
                        </div>
                        <h2 className={`text-4xl font-black tracking-tight flex items-center gap-3 ${activeTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Global Intel <span className="text-indigo-500">Brief</span>
                            <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                        </h2>
                        <p className={`text-sm font-medium mt-2 ${activeTheme === 'dark' ? 'text-slate-400' : 'text-gray-600'}`}>
                            Curated high-impact insights for {new Date(data.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {[1, 2].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 ring-2 ring-indigo-500/10">AI</div>)}
                        </div>
                        <Badge variant="info" className="text-[10px] uppercase tracking-tighter">
                            Decision Engine v2.4
                        </Badge>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {data.stories.map((story, idx) => (
                        <div key={idx} className={`flex flex-col p-7 rounded-[2rem] border transition-all duration-500 hover:-translate-y-2 group/card ${activeTheme === 'dark' ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/5 hover:border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-300'}`}>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-black text-indigo-500">
                                        0{idx + 1}
                                    </div>
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                </div>
                                <div className={`flex flex-col items-end`}>
                                    <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${activeTheme === 'dark' ? 'text-slate-500' : 'text-gray-600'}`}>Impact Score</span>
                                    <Badge
                                        variant={story.impact_score > 80 ? 'danger' : 'info'}
                                        className="text-[10px] font-black"
                                    >
                                        {story.impact_score}% HIGH
                                    </Badge>
                                </div>
                            </div>

                            <h3 className={`text-xl font-bold mb-4 line-clamp-2 leading-[1.2] tracking-tight group-hover/card:text-indigo-500 transition-colors ${activeTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                                {story.title}
                            </h3>

                            <div className="space-y-5 mt-auto">
                                <div className="relative pl-4 border-l-2 border-indigo-500/30">
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-500 font-black mb-1.5 flex items-center gap-1.5">
                                        <BrainCircuit className="w-3 h-3" /> AI Reasoning
                                    </p>
                                    <p className={`text-xs leading-relaxed font-medium ${activeTheme === 'dark' ? 'text-slate-300/90' : 'text-gray-700'}`}>
                                        {story.reason}
                                    </p>
                                </div>

                                <div className={`p-4 rounded-2xl border group-hover/card:border-indigo-500/20 transition-colors ${activeTheme === 'dark' ? 'bg-slate-900/60 border-white/5' : 'bg-white border-gray-300'}`}>
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-500 font-black mb-2 flex items-center gap-1.5">
                                        <Target className="w-3 h-3" /> Strategy Angle
                                    </p>
                                    <p className={`text-xs font-medium leading-normal ${activeTheme === 'dark' ? 'text-indigo-100' : 'text-gray-900'}`}>
                                        {story.angle}
                                    </p>
                                    <Button 
                                        variant="primary"
                                        size="md"
                                        className="mt-6 w-full text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_10px_20px_-5px_rgba(79,70,229,0.4)] border-none relative z-20 group/btn py-2.5"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            console.log('Deep dive clicked for:', story.title);
                                            window.dispatchEvent(new CustomEvent('open-story-details', { 
                                                detail: { title: story.title } 
                                            }));
                                        }}
                                    >
                                        Actionable: Explore Deep Dive 
                                        <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default DailyIntelligence;
