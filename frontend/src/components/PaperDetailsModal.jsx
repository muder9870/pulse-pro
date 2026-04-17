import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, AlertCircle, BarChart3, Users, Landmark, Clock, Activity, RefreshCw, Copy, Check, Download, FileText } from 'lucide-react';

function PaperDetailsModal({ isOpen, onClose, analysis, story, activeTheme = 'dark', onRegenerate }) {
    const [regenerating, setRegenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'methodology', label: 'Methodology', icon: Activity },
        { id: 'results', label: 'Results', icon: BarChart3 },
        { id: 'limitations', label: 'Limitations', icon: AlertCircle },
        { id: 'metadata', label: 'Metadata', icon: Users },
    ];
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

    const buildMarkdown = () => `# ${story.title}

## Technical Methodology
${analysis.methodology}

## Experimental Results
${analysis.results}

## Critical Limitations
${analysis.limitations}

## Authors
${Array.isArray(analysis.authors) ? analysis.authors.join(', ') : analysis.authors}

## Affiliations
${analysis.affiliations}`;

    const handleCopy = async () => {
        const text = buildMarkdown();
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const text = buildMarkdown();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `deep-dive-${story.id}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Loading skeleton component
    const SectionSkeleton = ({ lines = 3 }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ height: 16, borderRadius: 4, width: '25%', background: 'var(--border)', animation: 'pulse 1.5s infinite' }} />
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} style={{ height: 12, borderRadius: 4, width: '100%', background: 'var(--border)', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.15}s` }} />
            ))}
        </div>
    );

    return (
        <div 
            className="modal-overlay"
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-details-title"
        >
            <div className="modal" style={{ maxWidth: 900 }}>
                {/* Header */}
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                        <BookOpen style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                        <h2 id="paper-details-title" className="modal-title">Research Deep Dive</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="modal-close"
                        aria-label="Close modal"
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Tabbed Navigation */}
                <div className="modal-nav" style={{ overflowX: 'auto' }}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`modal-nav-item ${isActive ? 'active' : ''}`}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', whiteSpace: 'nowrap' }}
                            >
                                <Icon style={{ width: 14, height: 14 }} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="modal-body">
                    {!analysis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, color: 'var(--text3)' }}>
                                <Clock className="animate-pulse" style={{ width: 48, height: 48, marginBottom: 16 }} />
                                <p style={{ fontSize: 13 }}>Deep dive analysis loading...</p>
                                <p style={{ fontSize: 11, marginTop: 8, opacity: 0.7 }}>This may take 30-60 seconds</p>
                            </div>
                            <SectionSkeleton lines={4} />
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                <SectionSkeleton lines={2} />
                                <SectionSkeleton lines={2} />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div className="modal-section" style={{ background: 'var(--surface2)' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{story.title}</h3>
                                        <div className="modal-section-body" style={{ fontStyle: 'italic' }}>
                                            {story.summary || 'No summary available for this paper.'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Methodology Tab */}
                            {activeTab === 'methodology' && (
                                <div className="modal-section" style={{ border: '1px solid var(--teal)', background: 'var(--teal-dim)' }}>
                                    <div className="modal-section-title" style={{ color: 'var(--teal)' }}>
                                        <Activity style={{ width: 18, height: 18 }} />
                                        <span>Technical Methodology</span>
                                    </div>
                                    <div className="modal-section-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.methodology || 'No methodology details available.'}
                                    </div>
                                </div>
                            )}

                            {/* Results Tab */}
                            {activeTab === 'results' && (
                                <div className="modal-section" style={{ border: '1px solid var(--amber)', background: 'var(--amber-dim)' }}>
                                    <div className="modal-section-title" style={{ color: 'var(--amber)' }}>
                                        <BarChart3 style={{ width: 18, height: 18 }} />
                                        <span>Experimental Results</span>
                                    </div>
                                    <div className="modal-section-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.results || 'No results data available.'}
                                    </div>
                                </div>
                            )}

                            {/* Limitations Tab */}
                            {activeTab === 'limitations' && (
                                <div className="modal-section" style={{ border: '1px solid var(--pink)', background: 'var(--pink-dim)' }}>
                                    <div className="modal-section-title" style={{ color: 'var(--pink)' }}>
                                        <AlertCircle style={{ width: 18, height: 18 }} />
                                        <span>Critical Limitations</span>
                                    </div>
                                    <div className="modal-section-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.limitations?.trim?.() ? analysis.limitations : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                                                No limitations text returned yet — try running Deep Dive again or open the source PDF.
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Metadata Tab */}
                            {activeTab === 'metadata' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <div className="modal-section" style={{ background: 'var(--surface2)', marginBottom: 0 }}>
                                        <div className="modal-section-title" style={{ color: 'var(--text)' }}>
                                            <Users style={{ width: 18, height: 18 }} />
                                            <span>Authors</span>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {Array.isArray(analysis.authors) && analysis.authors.filter(Boolean).length > 0 ? (
                                                analysis.authors
                                                    .filter((a) => a && String(a).trim() && String(a).trim().toUpperCase() !== 'N/A')
                                                    .map((author, i) => (
                                                        <span 
                                                            key={i} 
                                                            className="pp-badge pp-badge-gray"
                                                            style={{ fontSize: 11, border: '1px solid var(--border)' }}
                                                        >
                                                            {author}
                                                        </span>
                                                    ))
                                            ) : (
                                                <span style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text3)' }}>
                                                    No author data available — run Deep Dive to extract author information.
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="modal-section" style={{ background: 'var(--surface2)', marginBottom: 0 }}>
                                        <div className="modal-section-title" style={{ color: 'var(--text)' }}>
                                            <Landmark style={{ width: 18, height: 18 }} />
                                            <span>Affiliations</span>
                                        </div>
                                        <div className="modal-section-body" style={{ fontStyle: 'italic' }}>
                                            {(analysis.affiliations && String(analysis.affiliations).trim()) ? (
                                                analysis.affiliations
                                            ) : (
                                                <span style={{ opacity: 0.7 }}>
                                                    Unknown affiliation — run Deep Dive or check the paper's first page.
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button
                        onClick={async () => { setRegenerating(true); await onRegenerate?.(); setRegenerating(false); }}
                        disabled={!analysis || regenerating}
                        className="pp-btn"
                        style={{ opacity: (!analysis || regenerating) ? 0.5 : 1 }}
                    >
                        <RefreshCw className={regenerating ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
                        {regenerating ? 'Regenerating…' : 'Regenerate'}
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={!analysis}
                        className="pp-btn"
                        style={{ opacity: !analysis ? 0.5 : 1 }}
                    >
                        {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!analysis}
                        className="pp-btn"
                        style={{ opacity: !analysis ? 0.5 : 1 }}
                    >
                        <Download style={{ width: 14, height: 14 }} />
                        Download
                    </button>
                    <button
                        onClick={onClose}
                        className="pp-btn pp-btn-primary"
                    >
                        Close Deep Dive
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaperDetailsModal;
