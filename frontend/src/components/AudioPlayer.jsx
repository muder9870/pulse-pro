import React from 'react';
import { Play, Pause, Volume2, Activity } from 'lucide-react';
import { useAudio } from '../context/AudioContext';

const AudioPlayer = ({ url, title }) => {
    const { 
        url: currentUrl, 
        isPlaying, 
        progress, 
        currentTime, 
        duration, 
        togglePlay, 
        playAudio, 
        seek 
    } = useAudio();

    const isCurrent = currentUrl === url;

    const handleToggle = () => {
        if (isCurrent) {
            togglePlay();
        } else {
            playAudio(url, title);
        }
    };

    const handleSeek = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = (x / rect.width) * 100;
        seek(percent);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const activePlay = isCurrent && isPlaying;

    return (
        <div className={`glass-morphism rounded-2xl p-4 border transition-all duration-300 ${activePlay ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-white/10'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activePlay ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                        <Activity className={`w-4 h-4 ${activePlay ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} />
                    </div>
                    <div className="overflow-hidden">
                        <span className={`text-[11px] font-bold uppercase tracking-wider block truncate ${activePlay ? 'text-white' : 'text-slate-400'}`}>
                            {title || 'Daily Digest'}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                            AI Synthesis Engine
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-white font-black font-mono px-2 py-1 bg-white/5 rounded-md">
                        {isCurrent ? formatTime(currentTime) : '0:00'} / {isCurrent ? formatTime(duration) : formatTime(0)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleToggle}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all transform active:scale-90 shadow-xl ${activePlay ? 'bg-indigo-600 text-white shadow-indigo-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                    {activePlay ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                </button>

                <div 
                    className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden relative group cursor-pointer"
                    onClick={handleSeek}
                >
                    <div
                        className={`h-full rounded-full transition-all duration-100 ${activePlay ? 'bg-indigo-500' : 'bg-slate-600'}`}
                        style={{ width: `${isCurrent ? progress : 0}%` }}
                    >
                        <div className="absolute top-0 right-0 w-2 h-full bg-white/40 blur-[2px]" />
                    </div>
                </div>

                <div className="p-2 rounded-xl bg-white/5 text-slate-500">
                    <Volume2 className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
};

export default AudioPlayer;
