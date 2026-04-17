import React, { useState, useEffect } from 'react';
import { Sparkles, Brain, Info, RefreshCw, UserCheck } from 'lucide-react';
import Button from './ui/Button';

export default function StyleProfile() {
    const [styles, setStyles] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStyles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/personalization/style');
            const data = await res.json();
            if (res.ok) {
                setStyles(data.style || {});
            } else {
                throw new Error(data.error || 'Failed to fetch style profile');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStyles();
    }, []);

    const getStyleDescription = (key, value) => {
        const descriptions = {
            length_preference: {
                concise: 'You prefer short, punchy content that gets straight to the point.',
                detailed: 'You prefer comprehensive, in-depth posts with more context.',
                balanced: 'You prefer a standard length that balances detail and brevity.'
            },
            emoji_usage: {
                more_emojis: 'You like using emojis to add personality and visual interest.',
                fewer_emojis: 'You prefer a clean, professional look with minimal emoji use.',
                standard: 'You use an average amount of emojis for social engagement.'
            }
        };
        return descriptions[key]?.[value] || `Your preferred setting for ${key} is "${value}".`;
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <RefreshCw className="animate-spin" style={{ width: 32, height: 32, color: 'var(--accent)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text2)' }}>Analyzing your style preferences...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-lg)', color: 'var(--red)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Error loading style profile</h3>
                <p>{error}</p>
                <button
                    onClick={fetchStyles}
                    style={{
                        marginTop: 16, padding: '8px 16px', borderRadius: 8,
                        border: '1px solid var(--red)', background: 'var(--red)',
                        color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    const hasStyles = Object.entries(styles).some(([k, v]) => k !== 'learned' && v !== null && v !== undefined);

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, lineHeight: 1.2 }}>
                        <Brain style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                        Style Profile
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                        AI learns from your edits to mirror your writing style
                    </p>
                </div>
                <button
                    onClick={fetchStyles}
                    style={{
                        padding: 8, borderRadius: '50%',
                        border: '1px solid var(--border)', background: 'var(--surface2)',
                        color: 'var(--text2)', cursor: 'pointer',
                    }}
                    title="Refresh profile"
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--surface2)'}
                >
                    <RefreshCw style={{ width: 16, height: 16 }} />
                </button>
            </div>

            {!hasStyles ? (
                <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
                    <Sparkles style={{ width: 48, height: 48, color: 'var(--accent)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Starting Your Journey</h2>
                    <p style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 400, margin: '0 auto' }}>
                        I haven't learned enough about your style yet. Start by editing generated content
                        or using the Thumbs Up/Down buttons on story cards!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {Object.entries(styles)
                        .filter(([key, value]) => key !== 'learned' && value !== null && value !== undefined)
                        .map(([key, value]) => {
                            const displayValue = typeof value === 'boolean'
                                ? (value ? 'Yes' : 'No')
                                : String(value).replace(/_/g, ' ');
                            const displayKey = String(key).replace(/_/g, ' ');
                            return (
                                <div key={key} className="style-option">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{ padding: 6, background: 'var(--accent-glow)', borderRadius: 8 }}>
                                            <UserCheck style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                                        </div>
                                        <h3 className="style-option-name" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 0 }}>
                                            {displayKey}
                                        </h3>
                                    </div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent2)', marginBottom: 6, textTransform: 'capitalize' }}>
                                        {displayValue}
                                    </div>
                                    <p className="style-option-desc" style={{ lineHeight: 1.5 }}>
                                        {getStyleDescription(key, String(value))}
                                    </p>
                                </div>
                            );
                        })}
                </div>
            )}

            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ padding: 12, background: 'var(--surface2)', borderRadius: 12 }}>
                        <Info style={{ width: 24, height: 24, color: 'var(--teal)' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>How does personalization work?</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text2)', fontSize: 11, lineHeight: 1.6 }}>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Active Learning:</strong> Every time you click "Save" on an edit,
                                Pulse Pro compares our initial draft with your final version to detect patterns in length,
                                tone, and formatting.
                            </p>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Feedback Loop:</strong> Your Thumbs Up/Down feedback helps us
                                prioritize style patterns that you align with.
                            </p>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Few-Shot Prompting:</strong> When generating new content, we
                                inject your best past edits as examples into the AI's technical prompt, creating a
                                personalized brand-voice mirror.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
