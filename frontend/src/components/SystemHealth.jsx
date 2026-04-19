import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
    Activity, CheckCircle, AlertCircle, Clock, RefreshCw, ShieldCheck,
    Database, Cpu, Zap, BarChart3, Flag, GitBranch, Server, TrendingDown
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

function StatCard({ label, value, sub, color = 'slate' }) {
    const colors = {
        green: { bg: 'var(--green-dim)', border: 'var(--green)', text: 'var(--green)' },
        red: { bg: 'var(--red-dim)', border: 'var(--red)', text: 'var(--red)' },
        amber: { bg: 'var(--amber-dim)', border: 'var(--amber)', text: 'var(--amber)' },
        blue: { bg: 'rgba(59,130,246,0.1)', border: 'var(--blue)', text: 'var(--blue)' },
        slate: { bg: 'var(--bg3)', border: 'var(--border)', text: 'var(--text2)' },
    };
    const style = colors[color] || colors.slate;
    return (
        <div style={{ borderRadius: 12, border: `1px solid ${style.border}`, padding: 16, background: style.bg }}>
            <p style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7, marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: style.text }}>{value}</p>
            {sub && <p style={{ fontSize: 11, marginTop: 4, opacity: 0.8 }}>{sub}</p>}
        </div>
    );
}

export default function SystemHealth({ onBack }) {
    const [loading, setLoading] = useState(true);
    const [health, setHealth] = useState(null);
    const [error, setError] = useState(null);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await apiFetch('/system/health');
            const data = await res.json();
            if (res.ok) {
                setHealth(data);
            } else {
                setError(data.error || 'Failed to fetch system health');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !health) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                <Activity className="animate-pulse" style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>Monitoring system vitals...</p>
            </div>
        );
    }

    if (error && !health) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
                <AlertCircle style={{ width: 40, height: 40, color: 'var(--red)' }} />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Health Check Failed</h3>
                <p style={{ color: 'var(--red)', background: 'var(--red-dim)', padding: '8px 16px', borderRadius: 8, fontSize: 12 }}>{error}</p>
                <button
                    onClick={fetchHealth}
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

    const services = health?.services || [];
    const cb = health?.circuit_breaker || {};
    const fallback = health?.fallback_statistics || {};
    const pipeline = health?.pipeline || {};
    const vitals = health?.vitals || {};
    const featureFlags = health?.feature_flags || {};
    const disabledFeatures = health?.disabled_features || [];
    const allOk = services.length > 0 && services.every(s => s.status === 'ok');

    const failureRate = typeof cb.failure_rate === 'number'
        ? `${(cb.failure_rate * 100).toFixed(1)}%`
        : '—';

    const fallbackRate = typeof fallback.fallback_rate === 'number'
        ? `${(fallback.fallback_rate * 100).toFixed(1)}%`
        : '—';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.2, flexWrap: 'wrap' }}>
                        System Health
                        {allOk
                            ? <ShieldCheck style={{ width: 24, height: 24, color: 'var(--green)' }} />
                            : services.length === 0
                                ? <AlertCircle style={{ width: 24, height: 24, color: 'var(--text3)' }} />
                                : <AlertCircle style={{ width: 24, height: 24, color: 'var(--amber)' }} />
                        }
                        {health?.stability_mode && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--amber-dim)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 12 }}>
                                Stability Mode
                            </span>
                        )}
                    </h1>
                    <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                        Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
                    </p>
                </div>
                <button
                    onClick={fetchHealth}
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

            {/* Top Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                <StatCard
                    label="LLM Failure Rate"
                    value={failureRate}
                    sub={`Threshold: ${cb.threshold ? (cb.threshold * 100).toFixed(0) + '%' : '—'}`}
                    color={cb.failure_rate > (cb.threshold || 0.5) ? 'red' : 'green'}
                />
                <StatCard
                    label="LLM Providers"
                    value={cb.total_providers ?? '—'}
                    sub={(cb.providers || []).join(', ') || 'none'}
                    color="blue"
                />
                <StatCard
                    label="Fallback Rate"
                    value={fallbackRate}
                    sub={`${fallback.fallback_count ?? 0} / ${fallback.total_processed ?? 0} articles`}
                    color={fallback.fallback_rate > 0.3 ? 'amber' : 'green'}
                />
                <StatCard
                    label="Pipeline"
                    value={pipeline.running ? 'Running' : 'Idle'}
                    sub={pipeline.last_finished_at
                        ? `Last: ${new Date(pipeline.last_finished_at).toLocaleTimeString()}`
                        : 'Never run'}
                    color={pipeline.running ? 'blue' : pipeline.last_error ? 'red' : 'green'}
                />
            </div>

            {/* Vitals */}
            {Object.keys(vitals).length > 0 && (
                <section>
                    <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Server style={{ width: 14, height: 14 }} /> System Vitals
                    </h2>
                    <div className="pp-card" style={{ display: 'flex', flexDirection: 'column', padding: '0 16px' }}>

                        {vitals.active_threads !== undefined && (
                            <div className="health-metric">
                                <span className="metric-name">Active Threads</span>
                                <span className="metric-val">{vitals.active_threads}</span>
                            </div>
                        )}
                        {vitals.database && (
                            <>
                                <div className="health-metric">
                                    <span className="metric-name">Database Connection Pool</span>
                                    <span className="metric-val">{vitals.database.connection_pool}</span>
                                </div>
                                <div className="health-metric">
                                    <span className="metric-name">Database Size</span>
                                    <span className="metric-val">
                                        {vitals.database.db_size_kb > 0 ? `${(vitals.database.db_size_kb / 1024).toFixed(1)} MB` : 'PostgreSQL'}
                                    </span>
                                </div>
                            </>
                        )}
                        {vitals.llm && (
                            <>
                                <div className="health-metric">
                                    <span className="metric-name">LLM Circuit Breaker</span>
                                    <span className="metric-val">{vitals.llm.circuit_breaker_tripped ? 'Tripped' : 'Healthy'}</span>
                                </div>
                                <div className="health-metric">
                                    <span className="metric-name">LLM Failure Rate</span>
                                    <span className="metric-val">{(vitals.llm.failure_rate * 100).toFixed(1)}%</span>
                                </div>
                            </>
                        )}
                        {vitals.queue && (
                            <div className="health-metric">
                                <span className="metric-name">Article Queue Pending</span>
                                <span className="metric-val">{vitals.queue.total_pending ?? 0}</span>
                            </div>
                        )}

                    </div>
                </section>
            )}

            {/* Pipeline Error */}
            {pipeline.last_error && (
                <div style={{ padding: 16, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <AlertCircle style={{ width: 18, height: 18, color: 'var(--red)', marginTop: 2, flexShrink: 0 }} />
                    <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)' }}>Last Pipeline Error</p>
                        <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>{pipeline.last_error}</p>
                    </div>
                </div>
            )}

            {/* Service Cards */}
            <section>
                <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Activity style={{ width: 14, height: 14 }} /> Pipeline Services ({services.length})
                </h2>
                {services.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 64, background: 'var(--bg3)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                        <Activity style={{ width: 48, height: 48, color: 'var(--text3)', margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text2)' }}>Waiting for first pipeline heartbeat</h3>
                        <p style={{ color: 'var(--text3)', maxWidth: 300, margin: '8px auto 0', fontSize: 12 }}>
                            Services appear here after the pipeline runs for the first time.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                        {services.map((service) => {
                            const name = service.service_name;
                            const total = (service.success_count || 0) + (service.failure_count || 0);
                            const successRate = total > 0
                                ? Math.round((service.success_count / total) * 100)
                                : null;

                            const labelMap = {
                                llm: 'LLM Router',
                                llm_groq: 'Groq',
                                llm_openrouter: 'OpenRouter',
                                llm_cerebras: 'Cerebras',
                                llm_local: 'Local (Ollama)',
                            };
                            const label = labelMap[name]
                                || name.replace('fetcher:', '').replace('processor:', '').replace(/_/g, ' ');

                            const isLLM = name.startsWith('llm');
                            const isFetcher = name.includes('fetcher');
                            const IconEl = isLLM ? Zap : isFetcher ? Database : Cpu;
                            const iconColor = isLLM ? 'var(--accent)' : isFetcher ? 'var(--teal)' : 'var(--purple)';

                            const isOk = service.status === 'ok';

                            return (
                                <div key={name} style={{
                                    background: 'var(--surface)', padding: 20, borderRadius: 12,
                                    border: `1px solid ${isOk ? 'var(--border)' : 'var(--red)'}`,
                                    transition: 'all 0.15s',
                                }} onMouseEnter={(e) => e.currentTarget.style.borderColor = isOk ? 'var(--border2)' : 'var(--red)'}
                                   onMouseLeave={(e) => e.currentTarget.style.borderColor = isOk ? 'var(--border)' : 'var(--red)'}>
                                    {/* Top row */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{
                                            padding: 8, borderRadius: 8,
                                            background: isOk ? 'var(--bg3)' : 'var(--red-dim)',
                                            transition: 'background 0.15s',
                                        }}>
                                            <IconEl style={{ width: 18, height: 18, color: iconColor }} />
                                        </div>
                                        <span style={{
                                            fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em',
                                            padding: '4px 8px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 4,
                                            background: isOk ? 'var(--green-dim)' : 'var(--red-dim)',
                                            color: isOk ? 'var(--green)' : 'var(--red)',
                                        }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: isOk ? 'var(--green)' : 'var(--red)' }} />
                                            {isOk ? 'OK' : 'Error'}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <h3 style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', fontSize: 13, marginBottom: 4 }}>{label}</h3>

                                    {/* Last run */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text3)', marginBottom: 16 }}>
                                        <Clock style={{ width: 12, height: 12 }} />
                                        <span>
                                            {service.last_run_at
                                                ? new Date(service.last_run_at).toLocaleString()
                                                : 'Never run'}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                                        <div>
                                            <p style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 700 }}>Successes</p>
                                            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>{service.success_count ?? 0}</p>
                                        </div>
                                        <div>
                                            <p style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 700 }}>Failures</p>
                                            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--red)' }}>{service.failure_count ?? 0}</p>
                                        </div>
                                        {successRate !== null && (
                                            <div>
                                                <p style={{ fontSize: 9, textTransform: 'uppercase', color: 'var(--text3)', fontWeight: 700 }}>Success Rate</p>
                                                <p style={{ fontSize: 18, fontWeight: 800, color: successRate >= 80 ? 'var(--green)' : successRate >= 50 ? 'var(--amber)' : 'var(--red)' }}>
                                                    {successRate}%
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Success rate bar */}
                                    {successRate !== null && (
                                        <div style={{ width: '100%', background: 'var(--bg3)', borderRadius: 12, height: 6, marginBottom: 12 }}>
                                            <div
                                                style={{
                                                    height: 6, borderRadius: 12, transition: 'all 0.15s',
                                                    background: successRate >= 80 ? 'var(--green)' : successRate >= 50 ? 'var(--amber)' : 'var(--red)',
                                                    width: `${successRate}%`,
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Last error */}
                                    {service.last_error && (
                                        <div style={{ padding: 10, background: 'var(--red-dim)', borderRadius: 8, border: '1px solid var(--red)' }}>
                                            <p style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }} title={service.last_error}>
                                                {service.last_error}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Feature Flags */}
            {Object.keys(featureFlags).length > 0 && (
                <section>
                    <h2 style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text3)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Flag style={{ width: 14, height: 14 }} /> Feature Flags
                        {disabledFeatures.length > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--amber-dim)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 12 }}>
                                {disabledFeatures.length} disabled
                            </span>
                        )}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                        {Object.entries(featureFlags).map(([flag, enabled]) => (
                            <div key={flag} className="feature-flag">
                                <span className="flag-name" style={{ textTransform: 'capitalize' }}>{flag.replace(/_/g, ' ')}</span>
                                <div className={`toggle ${enabled ? 'on' : 'off'}`} />
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
