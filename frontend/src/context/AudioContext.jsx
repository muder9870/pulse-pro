import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const AudioContext = createContext(null);

export const AudioProvider = ({ children }) => {
    const [audioData, setAudioData] = useState({
        url: null,
        title: null,
        isPlaying: false,
        duration: 0,
        currentTime: 0,
        progress: 0
    });
    
    const audioRef = useRef(new Audio());

    const playAudio = (url, title) => {
        if (audioData.url !== url) {
            audioRef.current.src = url;
            setAudioData(prev => ({ ...prev, url, title, isPlaying: true, currentTime: 0, progress: 0 }));
            audioRef.current.play();
        } else {
            audioRef.current.play();
            setAudioData(prev => ({ ...prev, isPlaying: true }));
        }
    };

    const pauseAudio = () => {
        audioRef.current.pause();
        setAudioData(prev => ({ ...prev, isPlaying: false }));
    };

    const togglePlay = () => {
        if (audioData.isPlaying) {
            pauseAudio();
        } else if (audioData.url) {
            audioRef.current.play();
            setAudioData(prev => ({ ...prev, isPlaying: true }));
        }
    };

    const seek = (percent) => {
        if (!audioRef.current.duration) return;
        const time = (percent / 100) * audioRef.current.duration;
        audioRef.current.currentTime = time;
    };

    useEffect(() => {
        const audio = audioRef.current;
        
        const onTimeUpdate = () => {
            setAudioData(prev => ({
                ...prev,
                currentTime: audio.currentTime,
                progress: (audio.currentTime / audio.duration) * 100 || 0
            }));
        };

        const onLoadedMetadata = () => {
            setAudioData(prev => ({ ...prev, duration: audio.duration }));
        };

        const onEnded = () => {
            setAudioData(prev => ({ ...prev, isPlaying: false, progress: 0, currentTime: 0 }));
        };

        const onError = (e) => {
            console.error("Audio error:", e);
            setAudioData(prev => ({ ...prev, isPlaying: false }));
        };

        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', onTimeUpdate);
            audio.removeEventListener('loadedmetadata', onLoadedMetadata);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
        };
    }, []);

    return (
        <AudioContext.Provider value={{
            ...audioData,
            playAudio,
            pauseAudio,
            togglePlay,
            seek
        }}>
            {children}
        </AudioContext.Provider>
    );
};

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) throw new Error('useAudio must be used within an AudioProvider');
    return context;
};
