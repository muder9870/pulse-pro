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
            style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="paper-details-title"
        >
            <div style={{ borderRadius: 'var(--radius-lg)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: 900, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                        <h2 id="paper-details-title" style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>Research Deep Dive</h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ padding: 8, borderRadius: '50%', transition: 'all 0.15s', border: 'none', background: 'transparent', color: 'var(--text2)', cursor: 'pointer' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg3)'; e.currentTarget.style.color = 'var(--text)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; }}
                        aria-label="Close modal"
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Tabbed Navigation */}
                <div style={{ padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                                        borderRadius: 8, border: 'none', background: isActive ? 'var(--accent-glow)' : 'transparent',
                                        color: isActive ? 'var(--accent)' : 'var(--text2)', fontSize: 12, fontWeight: 500,
                                        cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'var(--bg3)';
                                            e.currentTarget.style.color = 'var(--text)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = 'var(--text2)';
                                        }
                                    }}
                                >
                                    <Icon style={{ width: 14, height: 14 }} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
                                    <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                                        <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{story.title}</h3>
                                        <p style={{ fontSize: 13, lineHeight: 1.6, fontStyle: 'italic', color: 'var(--text2)' }}>
                                            {story.summary || 'No summary available for this paper.'}
                                        </p>
                                    </section>
                                </div>
                            )}

                            {/* Methodology Tab */}
                            {activeTab === 'methodology' && (
                                <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--teal)', background: 'var(--teal-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: 'var(--teal)', fontSize: 14 }}>
                                        <Activity style={{ width: 18, height: 18 }} />
                                        <h4>Technical Methodology</h4>
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.methodology || 'No methodology details available.'}
                                    </div>
                                </section>
                            )}

                            {/* Results Tab */}
                            {activeTab === 'results' && (
                                <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--amber)', background: 'var(--amber-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: 'var(--amber)', fontSize: 14 }}>
                                        <BarChart3 style={{ width: 18, height: 18 }} />
                                        <h4>Experimental Results</h4>
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.results || 'No results data available.'}
                                    </div>
                                </section>
                            )}

                            {/* Limitations Tab */}
                            {activeTab === 'limitations' && (
                                <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--pink)', background: 'var(--pink-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: 'var(--pink)', fontSize: 14 }}>
                                        <AlertCircle style={{ width: 18, height: 18 }} />
                                        <h4>Critical Limitations</h4>
                                    </div>
                                    <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: 'var(--text)' }}>
                                        {analysis.limitations?.trim?.() ? analysis.limitations : (
                                            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                                                No limitations text returned yet — try running Deep Dive again or open the source PDF.
                                            </span>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Metadata Tab */}
                            {activeTab === 'metadata' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                    <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                                            <Users style={{ width: 18, height: 18 }} />
                                            <h4>Authors</h4>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {Array.isArray(analysis.authors) && analysis.authors.filter(Boolean).length > 0 ? (
                                                analysis.authors
                                                    .filter((a) => a && String(a).trim() && String(a).trim().toUpperCase() !== 'N/A')
                                                    .map((author, i) => (
                                                        <span 
                                                            key={i} 
                                                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 11, background: 'var(--surface)', color: 'var(--text2)' }}
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
                                    </section>

                                    <section style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>
                                            <Landmark style={{ width: 18, height: 18 }} />
                                            <h4>Affiliations</h4>
                                        </div>
                                        <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--text2)' }}>
                                            {(analysis.affiliations && String(analysis.affiliations).trim()) ? (
                                                analysis.affiliations
                                            ) : (
                                                <span style={{ opacity: 0.7 }}>
                                                    Unknown affiliation — run Deep Dive or check the paper's first page.
                                                </span>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--surface2)' }}>
                    <button
                        onClick={async () => { setRegenerating(true); await onRegenerate?.(); setRegenerating(false); }}
                        disabled={!analysis || regenerating}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            opacity: (!analysis || regenerating) ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (!(!analysis || regenerating)) e.currentTarget.style.background = 'var(--bg3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                    >
                        <RefreshCw className={regenerating ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
                        {regenerating ? 'Regenerating…' : 'Regenerate'}
                    </button>
                    <button
                        onClick={handleCopy}
                        disabled={!analysis}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            opacity: !analysis ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (analysis) e.currentTarget.style.background = 'var(--bg3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                    >
                        {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={!analysis}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
                            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                            opacity: !analysis ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => { if (analysis) e.currentTarget.style.background = 'var(--bg3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface)'; }}
                    >
                        <Download style={{ width: 14, height: 14 }} />
                        Download
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px', borderRadius: 8, border: '1px solid var(--accent)',
                            background: 'var(--accent)', color: 'white', fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108,99,255,0.9)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent)'}
                    >
                        Close Deep Dive
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PaperDetailsModal;
