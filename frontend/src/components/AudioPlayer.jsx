import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw, Activity } from 'lucide-react';

const AudioPlayer = ({ url, title }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);

    const togglePlay = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const onTimeUpdate = () => {
        const current = audioRef.current.currentTime;
        const total = audioRef.current.duration;
        setProgress((current / total) * 100);
    };

    const onLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const onEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const formatTime = (time) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Activity className="w-4 h-4 text-blue-500 flex-shrink-0 animate-pulse" />
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                        {title || 'Playing Summary'}
                    </span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">
                    {formatTime(audioRef.current?.currentTime)} / {formatTime(duration)}
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={togglePlay}
                    className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all transform hover:scale-105"
                >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>

                <div className="flex-1 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden relative group cursor-pointer">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-100"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <Volume2 className="w-4 h-4 text-gray-400" />
            </div>

            <audio
                ref={audioRef}
                src={url}
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={onLoadedMetadata}
                onEnded={onEnded}
                hidden
            />
        </div>
    );
};

export default AudioPlayer;
