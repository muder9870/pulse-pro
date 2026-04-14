import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, ExternalLink, Zap, RefreshCw } from 'lucide-react';

export default function LLMProviders() {
    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState([]);
    const [error, setError] = useState(null);

    const fetchProviders = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/system/llm-providers');
            if (!response.ok) throw new Error('Failed to fetch providers');
            const data = await response.json();
            setProviders(data.providers || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProviders();
    }, []);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
                <Zap className="animate-pulse" style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>Loading LLM providers...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
                <XCircle style={{ width: 40, height: 40, color: 'var(--red)' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Failed to Load Providers</h3>
                <p style={{ color: 'var(--red)', background: 'var(--red-dim)', padding: '8px 16px', borderRadius: 8, fontSize: 12 }}>{error}</p>
                <button
                    onClick={fetchProviders}
                    style={{
                        padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    }}
                >
                    Try Again
                </button>
            </div>
        );
    }

    const configuredCount = providers.filter(p => p.configured).length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                        LLM Providers
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                        {configuredCount} of {providers.length} providers configured
                    </p>
                </div>
                <button
                    onClick={fetchProviders}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 500,
                        cursor: 'pointer', opacity: loading ? 0.5 : 1,
                    }}
                >
                    <RefreshCw className={loading ? 'animate-spin' : ''} style={{ width: 14, height: 14 }} />
                    Refresh
                </button>
            </div>

            {/* Provider List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {providers.map((provider) => (
                    <div
                        key={provider.key}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 16,
                            borderRadius: 12,
                            border: `1px solid ${provider.configured ? 'var(--border)' : 'var(--border2)'}`,
                            background: 'var(--surface)',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border2)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = provider.configured ? 'var(--border)' : 'var(--border2)'}
                    >
                        {/* Left: Status + Info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                            {/* Status Indicator */}
                            <div style={{
                                width: 40, height: 40, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: provider.configured ? 'var(--green-dim)' : 'var(--bg3)',
                                flexShrink: 0,
                            }}>
                                {provider.configured ? (
                                    <CheckCircle style={{ width: 22, height: 22, color: 'var(--green)' }} />
                                ) : (
                                    <XCircle style={{ width: 22, height: 22, color: 'var(--text3)' }} />
                                )}
                            </div>

                            {/* Provider Info */}
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{provider.name}</h3>
                                    {provider.free && (
                                        <span style={{
                                            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                            background: 'var(--green-dim)', color: 'var(--green)',
                                            padding: '2px 6px', borderRadius: 6,
                                        }}>
                                            Free
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>
                                    Model: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{provider.model}</span>
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--text3)' }}>{provider.notes}</p>
                            </div>
                        </div>

                        {/* Right: Get Key Link */}
                        {!provider.configured && (
                            <a
                                href={provider.get_key_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 14px', borderRadius: 8,
                                    background: 'var(--accent-glow)', color: 'var(--accent)',
                                    fontSize: 11, fontWeight: 600, textDecoration: 'none',
                                    transition: 'all 0.15s', flexShrink: 0,
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(108,99,255,0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-glow)'}
                            >
                                Get API Key
                                <ExternalLink style={{ width: 12, height: 12 }} />
                            </a>
                        )}
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div style={{
                padding: 16, background: 'var(--bg3)', borderRadius: 12,
                border: '1px solid var(--border)',
            }}>
                <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
                    <strong style={{ color: 'var(--text)' }}>Note:</strong> Configure API keys in your environment variables ({providers.map(p => p.key).join(', ')}) to enable providers. The system automatically uses the first available configured provider.
                </p>
            </div>
        </div>
    );
}
