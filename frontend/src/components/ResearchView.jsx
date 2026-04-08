import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Filter, FlaskConical, ChevronRight, BarChart3, ExternalLink, RefreshCw } from 'lucide-react';
import PaperDetailsModal from './PaperDetailsModal';

function ResearchView() {
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPaper, setSelectedPaper] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [deepDiving, setDeepDiving] = useState(false);

    const fetchPapers = async () => {
        setLoading(true);
        try {
            // Fetch arxiv papers directly using the source filter
            const res = await fetch('/api/stories?limit=100&source=arxiv&sort=score');
            const data = await res.json();
            setPapers(data);
        } catch (err) {
            console.error("Failed to fetch research papers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPapers();
    }, []);

    const openDeepDive = async (paper) => {
        setSelectedPaper(paper);
        setAnalysis(null);
        setModalOpen(true);

        // First check if analysis already exists
        try {
            const res = await fetch(`/api/research/analysis/${paper.id}`);
            const data = await res.json();
            
            // Handle both 200 (success with analysis) and 202 (pending) responses
            if (res.ok && data.analysis) {
                setAnalysis(data.analysis);
            } else if (res.status === 202) {
                // Analysis not ready, trigger deep dive
                setDeepDiving(true);
                const diveRes = await fetch('/api/research/deep-dive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ article_id: paper.id })
                });
                const diveData = await diveRes.json();
                if (diveRes.ok && diveData.analysis) {
                    setAnalysis(diveData.analysis);
                } else {
                    alert(diveData.error || "Deep dive failed");
                    setModalOpen(false);
                }
            } else {
                // Fallback: try direct deep dive
                setDeepDiving(true);
                const diveRes = await fetch('/api/research/deep-dive', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ article_id: paper.id })
                });
                const diveData = await diveRes.json();
                if (diveRes.ok && diveData.analysis) {
                    setAnalysis(diveData.analysis);
                } else {
                    alert(diveData.error || "Deep dive unavailable for this paper");
                    setModalOpen(false);
                }
            }
        } catch (err) {
            console.error("Deep dive error", err);
            alert("Failed to connect to research engine");
            setModalOpen(false);
        } finally {
            setDeepDiving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Research Assistant</h2>
                    <p className="text-gray-500">Deep technical analysis of the latest academic papers</p>
                </div>
                <button
                    onClick={fetchPapers}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                >
                    <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-24 bg-slate-100 rounded-xl border border-slate-200" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {papers.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
                            <BookOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No research papers found in your feed yet.</p>
                            <p className="text-sm">Try running the pipeline or adding more arXiv feeds.</p>
                        </div>
                    ) : (
                        papers.map(paper => (
                            <div key={paper.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded">
                                                {paper.category || 'AI'}
                                            </span>
                                            <span className="text-xs text-gray-400">{new Date(paper.fetched_at).toLocaleDateString()}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2">
                                            {paper.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-4 italic">
                                            {paper.summary}
                                        </p>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <BarChart3 className="w-4 h-4 text-emerald-500" />
                                                <span className="text-sm text-gray-700 font-medium">Tech Score: {paper.tech_score}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => openDeepDive(paper)}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            <FlaskConical className="w-4 h-4" />
                                            Deep Dive
                                        </button>
                                        <a
                                            href={paper.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            arXiv
                                        </a>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <PaperDetailsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                analysis={analysis}
                story={selectedPaper}
            />
        </div>
    );
}

export default ResearchView;
