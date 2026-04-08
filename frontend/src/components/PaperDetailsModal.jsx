import React, { useEffect, useCallback } from 'react';
import { X, BookOpen, AlertCircle, BarChart3, Users, Landmark, Clock, Activity } from 'lucide-react';

function PaperDetailsModal({ isOpen, onClose, analysis, story, activeTheme = 'dark' }) {
    // Handle ESC key to close modal
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen || !story) return null;

    const isDark = activeTheme === 'dark';

    // Loading skeleton component
    const SectionSkeleton = ({ lines = 3 }) => (
        <div className="space-y-3 animate-pulse">
            <div className={`h-4 rounded w-1/4 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className={`h-3 rounded w-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
            ))}
        </div>
    );

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-details-title"
        >
            <div className={`rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-slate-900 border border-slate-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50/50'}`}>
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        <h2 id="paper-details-title" className={`text-xl font-bold truncate pr-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Research Deep Dive</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-gray-500'}`}
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Abstract/Intro */}
                    <section>
                        <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {story.title}
                        </h3>
                        <p className={`text-sm leading-relaxed italic ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                            {story.summary || 'No summary available for this paper.'}
                        </p>
                    </section>

                    {!analysis ? (
                        <div className="space-y-6">
                            <div className={`flex flex-col items-center justify-center py-8 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                                <Clock className="w-12 h-12 mb-4 animate-pulse" />
                                <p>Deep dive analysis loading...</p>
                                <p className="text-xs mt-2 opacity-70">This may take 30-60 seconds</p>
                            </div>
                            <SectionSkeleton lines={4} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SectionSkeleton lines={2} />
                                <SectionSkeleton lines={2} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Methodology */}
                            <section className={`rounded-xl p-5 border ${isDark ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50/50 border-blue-100'}`}>
                                <div className={`flex items-center gap-2 mb-3 font-bold ${isDark ? 'text-blue-400' : 'text-blue-800'}`}>
                                    <Activity className="w-5 h-5" />
                                    <h4>Technical Methodology</h4>
                                </div>
                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-blue-100' : 'text-blue-900'}`}>
                                    {analysis.methodology || 'No methodology details available.'}
                                </div>
                            </section>

                            {/* Key Results */}
                            <section className={`rounded-xl p-5 border ${isDark ? 'bg-green-900/20 border-green-800/50' : 'bg-green-50/50 border-green-100'}`}>
                                <div className={`flex items-center gap-2 mb-3 font-bold ${isDark ? 'text-green-400' : 'text-green-800'}`}>
                                    <BarChart3 className="w-5 h-5" />
                                    <h4>Experimental Results</h4>
                                </div>
                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-green-100' : 'text-green-900'}`}>
                                    {analysis.results || 'No results data available.'}
                                </div>
                            </section>

                            {/* Limitations */}
                            <section className={`rounded-xl p-5 border ${isDark ? 'bg-amber-900/20 border-amber-800/50' : 'bg-amber-50/50 border-amber-100'}`}>
                                <div className={`flex items-center gap-2 mb-3 font-bold ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
                                    <AlertCircle className="w-5 h-5" />
                                    <h4>Critical Limitations</h4>
                                </div>
                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-amber-100' : 'text-amber-900'}`}>
                                    {analysis.limitations?.trim?.() ? analysis.limitations : (
                                        <span className="italic opacity-70">
                                            No limitations text returned yet — try running Deep Dive again or open the source PDF.
                                        </span>
                                    )}
                                </div>
                            </section>

                            {/* Authors & Meta */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <section className={`rounded-xl p-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`flex items-center gap-2 mb-3 font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                        <Users className="w-5 h-5" />
                                        <h4>Authors</h4>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {Array.isArray(analysis.authors) && analysis.authors.filter(Boolean).length > 0 ? (
                                            analysis.authors
                                                .filter((a) => a && String(a).trim() && String(a).trim().toUpperCase() !== 'N/A')
                                                .map((author, i) => (
                                                    <span 
                                                        key={i} 
                                                        className={`px-2 py-1 border rounded text-xs ${isDark ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-gray-200 text-gray-600'}`}
                                                    >
                                                        {author}
                                                    </span>
                                                ))
                                        ) : (
                                            <span className={`text-xs italic ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                                                No author data available — run Deep Dive to extract author information.
                                            </span>
                                        )}
                                    </div>
                                </section>

                                <section className={`rounded-xl p-5 border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className={`flex items-center gap-2 mb-3 font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                                        <Landmark className="w-5 h-5" />
                                        <h4>Affiliations</h4>
                                    </div>
                                    <div className={`text-sm italic ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                                        {(analysis.affiliations && String(analysis.affiliations).trim()) ? (
                                            analysis.affiliations
                                        ) : (
                                            <span className="opacity-70">
                                                Unknown affiliation — run Deep Dive or check the paper's first page.
                                            </span>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-gray-100 bg-gray-50'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
                    >
                        Close Deep Dive
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaperDetailsModal;
