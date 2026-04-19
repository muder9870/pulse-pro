import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { CheckCircle, XCircle, ExternalLink, Zap, RefreshCw } from 'lucide-react';

export default function LLMProviders() {
    const [loading, setLoading] = useState(true);
    const [providers, setProviders] = useState([]);
    const [error, setError] = useState(null);

    const fetchProviders = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiFetch('/system/llm-providers');
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
            <div className="pp-card" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
                {providers.map((provider) => (
                    <div key={provider.key} className="provider-row">
                        {provider.configured ? (
                            <div className="provider-check">
                                <CheckCircle style={{ width: 10, height: 10, color: 'var(--green)' }} />
                            </div>
                        ) : (
                            <div className="provider-x" />
                        )}
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="provider-name">{provider.name}</span>
                                {provider.free && (
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                                        background: 'var(--green-dim)', color: 'var(--green)',
                                        padding: '1px 6px', borderRadius: 4,
                                    }}>
                                        Free
                                    </span>
                                )}
                            </div>
                            <span className="provider-model">{provider.model}</span>
                        </div>

                        {!provider.configured && (
                            <a
                                href={provider.get_key_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="pp-btn pp-btn-ghost pp-btn-sm"
                                style={{ textDecoration: 'none', background: 'var(--accent-glow)', color: 'var(--accent)', borderColor: 'transparent' }}
                            >
                                Get API Key
                                <ExternalLink style={{ width: 10, height: 10 }} />
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
