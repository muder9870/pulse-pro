import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { Sparkles, Brain, Info, RefreshCw, UserCheck, Zap } from 'lucide-react';
import Button from './ui/Button';

const PLATFORM_ICONS = {
    twitter: '𝕏',
    linkedin: '💼',
    instagram: '📸',
    threads: '@',
    youtube: '▶️',
    medium: '📝',
    reddit: '🔴',
    facebook: 'f'
};

const PLATFORM_COLORS = {
    twitter: '#1DA1F2',
    linkedin: '#0A66C2',
    instagram: '#E4405F',
    threads: '#262626',
    youtube: '#FF0000',
    medium: '#000000',
    reddit: '#FF4500',
    facebook: '#1877F2'
};

export default function StyleProfile() {
    const [platformStyles, setPlatformStyles] = useState({});
    const [selectedPlatform, setSelectedPlatform] = useState('twitter');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllPlatformStyles = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/personalization/all-platform-styles');
            const data = await res.json();
            if (res.ok) {
                setPlatformStyles(data.platforms || {});
                // Set default to first platform with learning, or twitter
                const platformsWithLearning = Object.keys(data.platforms || {}).filter(p => data.platforms[p].learned);
                if (platformsWithLearning.length > 0) {
                    setSelectedPlatform(platformsWithLearning[0]);
                }
            } else {
                throw new Error(data.error || 'Failed to fetch platform styles');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPlatformStyles();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <RefreshCw className="animate-spin" style={{ width: 32, height: 32, color: 'var(--accent)', marginBottom: 16 }} />
                <p style={{ color: 'var(--text2)' }}>Analyzing your platform-specific styles...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 'var(--radius-lg)', color: 'var(--red)' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Error loading style profile</h3>
                <p>{error}</p>
                <button
                    onClick={fetchAllPlatformStyles}
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

    const selectedStyleData = platformStyles[selectedPlatform] || { learned: false, rules: [] };
    const hasAnyLearning = Object.values(platformStyles).some(p => p.learned);

    return (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, lineHeight: 1.2 }}>
                        <Brain style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                        Platform-Specific Style Profile
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>
                        AI learns separate writing styles for each platform from your edits
                    </p>
                </div>
                <button
                    onClick={fetchAllPlatformStyles}
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

            {/* Platform Tabs */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(platformStyles).map(platform => {
                    const isSelected = selectedPlatform === platform;
                    const hasLearning = platformStyles[platform].learned;
                    return (
                        <button
                            key={platform}
                            onClick={() => setSelectedPlatform(platform)}
                            style={{
                                padding: '10px 16px',
                                borderRadius: 'var(--radius-lg)',
                                border: isSelected ? `2px solid ${PLATFORM_COLORS[platform]}` : '1px solid var(--border)',
                                background: isSelected ? 'var(--surface2)' : 'var(--surface)',
                                color: isSelected ? PLATFORM_COLORS[platform] : 'var(--text2)',
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: isSelected ? 600 : 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => !isSelected && (e.currentTarget.style.background = 'var(--bg3)')}
                            onMouseLeave={(e) => !isSelected && (e.currentTarget.style.background = 'var(--surface)')}
                        >
                            <span style={{ fontSize: 16 }}>{PLATFORM_ICONS[platform]}</span>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                            {hasLearning && <Zap style={{ width: 12, height: 12, color: PLATFORM_COLORS[platform] }} />}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {!hasAnyLearning ? (
                <div style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
                    <Sparkles style={{ width: 48, height: 48, color: 'var(--accent)', margin: '0 auto 16px' }} />
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Start Your Learning Journey</h2>
                    <p style={{ fontSize: 12, color: 'var(--text2)', maxWidth: 400, margin: '0 auto' }}>
                        I haven't learned your style yet. Edit generated content or use Thumbs Up/Down on story cards to teach me your platform-specific voice!
                    </p>
                </div>
            ) : selectedStyleData.learned ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Platform Learning Status */}
                    <div style={{ 
                        background: 'var(--surface)',
                        border: `2px solid ${PLATFORM_COLORS[selectedPlatform]}20`,
                        borderRadius: 'var(--radius-lg)',
                        padding: 20
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ 
                                padding: 8, 
                                background: `${PLATFORM_COLORS[selectedPlatform]}20`,
                                borderRadius: 8,
                                color: PLATFORM_COLORS[selectedPlatform],
                                fontSize: 20
                            }}>
                                {PLATFORM_ICONS[selectedPlatform]}
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                                    {selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} Style Rules
                                </h3>
                                <p style={{ fontSize: 12, color: 'var(--text2)' }}>
                                    Based on your edits and feedback on this platform
                                </p>
                            </div>
                        </div>

                        {selectedStyleData.rules.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {selectedStyleData.rules.map((rule, idx) => (
                                    <div key={idx} style={{
                                        background: 'var(--bg3)',
                                        padding: 12,
                                        borderRadius: 8,
                                        borderLeft: `3px solid ${PLATFORM_COLORS[selectedPlatform]}`,
                                        fontSize: 12,
                                        color: 'var(--text)',
                                        lineHeight: 1.5
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 600, color: PLATFORM_COLORS[selectedPlatform] }}>Rule {idx + 1}:</span> {rule.rule}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--text2)', textAlign: 'right', minWidth: 60 }}>
                                                <div>{Math.round(rule.confidence * 100)}% confidence</div>
                                                <div>{rule.occurrences} samples</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 16 }}>
                        No learning data yet for <strong>{selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)}</strong>
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text2)' }}>
                        Start editing content or providing feedback for this platform to build a personalized style guide
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ padding: 12, background: 'var(--surface2)', borderRadius: 12 }}>
                        <Info style={{ width: 24, height: 24, color: 'var(--teal)' }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Platform-Specific Learning</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, color: 'var(--text2)', fontSize: 11, lineHeight: 1.6 }}>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Per-Platform Analysis:</strong> Pulse Pro learns different styles for each platform. 
                                Twitter content stays concise, while LinkedIn posts become more professional.
                            </p>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Feedback Integration:</strong> Your Thumbs Up/Down and content edits are analyzed 
                                per-platform to build unique style guidelines for each network.
                            </p>
                            <p>
                                <strong style={{ color: 'var(--text)' }}>Smart Regeneration:</strong> When you mark content as "helpful" or regenerate, 
                                the system applies platform-specific rules learned from your previous edits.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
