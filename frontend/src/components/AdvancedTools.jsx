import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
    Terminal, RefreshCw, Download, Zap, Database, Activity,
    CheckCircle, AlertCircle, Clock, BarChart3, Cpu, Trash2,
    Play, ChevronDown, ChevronUp, Key, ExternalLink
} from 'lucide-react';

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
    return (
        <div style={{ 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border)', 
            background: 'var(--surface)', 
            overflow: 'hidden' 
        }}>
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                padding: '16px 24px', 
                borderBottom: '1px solid var(--border)', 
                background: 'var(--surface2)' 
            }}>
                <Icon style={{ width: 16, height: 16, color: 'var(--accent)' }} />
                <h3 style={{ 
                    fontSize: 13, 
                    fontWeight: 700, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em', 
                    color: 'var(--text)' 
                }}>{title}</h3>
            </div>
            <div style={{ padding: 24 }}>{children}</div>
        </div>
    );
}

function ActionButton({ onClick, loading, disabled, variant = 'primary', icon: Icon, children }) {
    const base = {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
        opacity: (disabled || loading) ? 0.5 : 1
    };
    
    const variants = {
        primary: { background: 'var(--accent)', color: '#fff' },
        danger: { background: 'var(--red)', color: '#fff' },
        outline: { border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)' },
        success: { background: 'var(--green)', color: '#fff' },
    };
    
    const style = { ...base, ...variants[variant] };
    
    return (
        <button 
            onClick={onClick} 
            disabled={disabled || loading} 
            style={style}
            onMouseDown={(e) => !disabled && !loading && (e.currentTarget.style.transform = 'scale(0.98)')}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
            {loading
                ? <RefreshCw style={{ width: 16, height: 16 }} className="animate-spin" />
                : Icon && <Icon style={{ width: 16, height: 16 }} />
            }
            {children}
        </button>
    );
}

function ResultBadge({ ok, text }) {
    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 20,
            background: ok ? 'var(--green-dim)' : 'var(--red-dim)',
            color: ok ? 'var(--green)' : 'var(--red)'
        }}>
            {ok ? <CheckCircle style={{ width: 12, height: 12 }} /> : <AlertCircle style={{ width: 12, height: 12 }} />}
            {text}
        </span>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdvancedTools({ activeTheme }) {
    // ── LLM Provider Status ───────────────────────────────────────────────────
    const [llmProviders, setLlmProviders] = useState(null);
    const [llmLoading, setLlmLoading] = useState(false);

    const fetchLlmProviders = async () => {
        setLlmLoading(true);
        try {
            const res = await apiFetch('/system/llm-providers');
            if (res.ok) setLlmProviders(await res.json());
        } catch { /* silent */ } finally {
            setLlmLoading(false);
        }
    };

    useEffect(() => { fetchLlmProviders(); }, []);

    // ── Pipeline ──────────────────────────────────────────────────────────────
    const [pipelineStatus, setPipelineStatus] = useState(null);
    const [pipelineRunning, setPipelineRunning] = useState(false);
    const [pipelineMsg, setPipelineMsg] = useState(null);

    const fetchPipelineStatus = async () => {
        try {
            const res = await apiFetch('/pipeline/status');
            const data = await res.json();
            setPipelineStatus(data);
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchPipelineStatus();
        const t = setInterval(fetchPipelineStatus, 10000);
        return () => clearInterval(t);
    }, []);

    const runPipeline = async () => {
        setPipelineRunning(true);
        setPipelineMsg(null);
        try {
            const res = await apiFetch('/pipeline/run', { method: 'POST' });
            const data = await res.json();
            setPipelineMsg({ ok: res.ok, text: data.message || (res.ok ? 'Pipeline started' : data.error) });
        } catch (e) {
            setPipelineMsg({ ok: false, text: e.message });
        } finally {
            setPipelineRunning(false);
            setTimeout(fetchPipelineStatus, 2000);
        }
    };

    // ── Performance metrics ───────────────────────────────────────────────────
    const [perfMetrics, setPerfMetrics] = useState(null);
    const [perfLoading, setPerfLoading] = useState(false);

    const fetchPerf = async () => {
        setPerfLoading(true);
        try {
            const res = await apiFetch('/performance/metrics');
            if (res.ok) setPerfMetrics(await res.json());
        } catch { /* silent */ } finally {
            setPerfLoading(false);
        }
    };

    useEffect(() => { fetchPerf(); }, []);

    // ── Cache stats ───────────────────────────────────────────────────────────
    const [cacheStats, setCacheStats] = useState(null);
    const [cacheLoading, setCacheLoading] = useState(false);

    const fetchCache = async () => {
        setCacheLoading(true);
        try {
            const res = await apiFetch('/performance/cache-stats');
            const data = await res.json();
            if (res.ok) {
                setCacheStats(data);
            } else {
                // 503 = Redis not available — show graceful message
                setCacheStats({ error: data.error || 'Redis not available' });
            }
        } catch { /* silent */ } finally {
            setCacheLoading(false);
        }
    };

    useEffect(() => { fetchCache(); }, []);
    // ── Real-time Metrics — pull from the same performance endpoint ──────────
    const [realtimeMetrics, setRealtimeMetrics] = useState(null);

    const fetchRealtime = async () => {
        try {
            const res = await apiFetch('/metrics/realtime');
            if (res.ok) {
                const data = await res.json();
                // Only show if there's non-zero data
                const hasData = Object.values(data).some(v => typeof v === 'number' && v > 0);
                if (hasData) setRealtimeMetrics(data);
            }
        } catch { /* silent */ }
    };

    useEffect(() => {
        fetchRealtime();
        const t = setInterval(fetchRealtime, 15000);
        return () => clearInterval(t);
    }, []);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    const [cleanupResult, setCleanupResult] = useState(null);
    const [cleanupLoading, setCleanupLoading] = useState(false);

    const runCleanup = async () => {
        if (!window.confirm('Remove orphaned articles and system_fallback placeholder content from the database?')) return;
        setCleanupLoading(true);
        setCleanupResult(null);
        try {
            const res = await apiFetch('/system/cleanup-orphans', { method: 'POST' });
            const data = await res.json();
            setCleanupResult({ ok: res.ok, data });
        } catch (e) {
            setCleanupResult({ ok: false, data: { error: e.message } });
        } finally {
            setCleanupLoading(false);
        }
    };

    // ── RSS health check ──────────────────────────────────────────────────────
    const [rssHealthResult, setRssHealthResult] = useState(null);
    const [rssHealthLoading, setRssHealthLoading] = useState(false);

    const runRssHealthCheck = async () => {
        setRssHealthLoading(true);
        setRssHealthResult(null);
        try {
            const res = await apiFetch('/rss/health-check', { method: 'POST' });
            const data = await res.json();
            setRssHealthResult({ ok: res.ok, data });
        } catch (e) {
            setRssHealthResult({ ok: false, data: { error: e.message } });
        } finally {
            setRssHealthLoading(false);
        }
    };

    // ── Export ────────────────────────────────────────────────────────────────
    const [exportLoading, setExportLoading] = useState(false);
    const [exportMsg, setExportMsg] = useState(null);

    const runExport = async () => {
        setExportLoading(true);
        setExportMsg(null);
        try {
            // Use CSV format for a clean file download
            const res = await apiFetch('/export?format=csv&limit=500');
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setExportMsg({ ok: false, text: err.error || 'Export failed' });
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pulse-export-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            setExportMsg({ ok: true, text: 'Export downloaded' });
        } catch (e) {
            setExportMsg({ ok: false, text: e.message });
        } finally {
            setExportLoading(false);
        }
    };

    // ── Scheduler ─────────────────────────────────────────────────────────────
    const [scheduleInfo, setScheduleInfo] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);

    const fetchSchedule = async () => {
        try {
            const res = await apiFetch('/schedule');
            if (res.ok) setScheduleInfo(await res.json());
        } catch { /* silent */ }
    };

    useEffect(() => { fetchSchedule(); }, []);

    const toggleScheduler = async (enable) => {
        setScheduleLoading(true);
        try {
            await apiFetch(`scheduler/${enable ? 'enable' : 'disable'}`, { method: 'POST' });
            await fetchSchedule();
        } catch { /* silent */ } finally {
            setScheduleLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    const isDark = activeTheme === 'dark';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Warning banner */}
            <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 12, 
                padding: 16, 
                background: 'var(--amber-dim)', 
                border: '1px solid var(--amber)', 
                borderRadius: 'var(--radius-lg)' 
            }}>
                <Terminal style={{ width: 20, height: 20, color: 'var(--amber)', marginTop: 2, flexShrink: 0 }} />
                <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>Developer & Operations Tools</p>
                    <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2, opacity: 0.9 }}>
                        These tools directly affect the pipeline, database, and scheduler. Use with care.
                    </p>
                </div>
            </div>

            {/* LLM Provider Status */}
            <Section title="LLM Providers" icon={Key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                        {llmProviders
                            ? `${llmProviders.configured_count} of ${llmProviders.total_count} providers configured`
                            : 'Loading…'}
                    </p>
                    <ActionButton onClick={fetchLlmProviders} loading={llmLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {llmProviders?.providers ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {llmProviders.providers.map(p => (
                            <div key={p.name} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: 'var(--radius-lg)',
                                border: '1px solid var(--border)',
                                background: p.configured ? 'var(--green-dim)' : 'var(--surface2)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                    {p.configured
                                        ? <CheckCircle style={{ width: 16, height: 16, color: 'var(--green)', flexShrink: 0 }} />
                                        : <AlertCircle style={{ width: 16, height: 16, color: 'var(--text3)', flexShrink: 0 }} />
                                    }
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ 
                                                fontSize: 13, 
                                                fontWeight: 700, 
                                                color: p.configured ? 'var(--text)' : 'var(--text3)' 
                                            }}>
                                                {p.name}
                                            </span>
                                            {p.free && (
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 700,
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.05em',
                                                    padding: '2px 6px',
                                                    borderRadius: 20,
                                                    background: 'var(--green-dim)',
                                                    color: 'var(--green)'
                                                }}>
                                                    Free
                                                </span>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 10, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.model}</p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 16 }}>
                                    {!p.configured && p.get_key_url && (
                                        <a
                                            href={p.get_key_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: 4, 
                                                fontSize: 12, 
                                                fontWeight: 700, 
                                                color: 'var(--accent)', 
                                                textDecoration: 'none'
                                            }}
                                        >
                                            Get Key <ExternalLink style={{ width: 12, height: 12 }} />
                                        </a>
                                    )}
                                    {p.configured && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)' }}>Configured</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>Loading provider status…</p>
                )}
            </Section>

            {/* Pipeline Control */}
            <Section title="Pipeline Control" icon={Play}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: pipelineStatus?.running ? 'var(--amber)' :
                                    pipelineStatus?.status === 'error' ? 'var(--red)' : 'var(--green)',
                                boxShadow: pipelineStatus?.running ? '0 0 8px var(--amber)' : 'none'
                            }} className={pipelineStatus?.running ? 'animate-pulse' : ''} />
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textTransform: 'capitalize' }}>
                                {pipelineStatus?.status ?? 'Unknown'}
                            </span>
                        </div>
                        {pipelineStatus?.last_finished_at && (
                            <p style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock style={{ width: 12, height: 12 }} />
                                Last run: {new Date(pipelineStatus.last_finished_at).toLocaleString()}
                            </p>
                        )}
                        {pipelineStatus?.last_error && (
                            <p style={{ 
                                fontSize: 12, 
                                color: 'var(--red)', 
                                fontFamily: 'monospace', 
                                maxWidth: 400, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }} title={pipelineStatus.last_error}>
                                {pipelineStatus.last_error}
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {pipelineMsg && <ResultBadge ok={pipelineMsg.ok} text={pipelineMsg.text} />}
                        <ActionButton
                            onClick={runPipeline}
                            loading={pipelineRunning}
                            disabled={pipelineStatus?.running}
                            icon={Zap}
                        >
                            {pipelineStatus?.running ? 'Running…' : 'Run Pipeline Now'}
                        </ActionButton>
                    </div>
                </div>
            </Section>

            {/* Scheduler */}
            <Section title="Automation Scheduler" icon={Clock}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {scheduleInfo ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: scheduleInfo.running ? 'var(--green)' : 'var(--text3)'
                                    }} />
                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                        {scheduleInfo.running ? 'Active' : 'Stopped'}
                                    </span>
                                </div>
                                {scheduleInfo.next_run_time && (
                                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                                        Next run: {new Date(scheduleInfo.next_run_time).toLocaleString()}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p style={{ fontSize: 13, color: 'var(--text3)' }}>Loading scheduler status…</p>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <ActionButton
                            onClick={() => toggleScheduler(true)}
                            loading={scheduleLoading}
                            variant="success"
                            icon={Play}
                        >
                            Enable
                        </ActionButton>
                        <ActionButton
                            onClick={() => toggleScheduler(false)}
                            loading={scheduleLoading}
                            variant="outline"
                            icon={Activity}
                        >
                            Disable
                        </ActionButton>
                    </div>
                </div>
            </Section>

            {/* Performance Metrics */}
            <Section title="Performance Metrics" icon={BarChart3}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <ActionButton onClick={fetchPerf} loading={perfLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {perfMetrics ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Throughput */}
                        {perfMetrics.throughput && Object.keys(perfMetrics.throughput).length > 0 && (
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>Article Throughput</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                    {[
                                        { k: 'articles_last_1h', label: 'Articles (1h)' },
                                        { k: 'articles_last_24h', label: 'Articles (24h)' },
                                        { k: 'analyzed_last_24h', label: 'Analyzed (24h)' },
                                        { k: 'content_last_24h', label: 'Content (24h)' },
                                        { k: 'total_articles', label: 'Total Articles' },
                                        { k: 'total_analyzed', label: 'Total Analyzed' },
                                        { k: 'total_content_generated', label: 'Total Content' },
                                    ].map(({ k, label }) => perfMetrics.throughput[k] !== undefined && (
                                        <div key={k} style={{ background: 'var(--green-dim)', borderRadius: 10, padding: 8, border: '1px solid var(--green)', textAlign: 'center' }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--green)', marginBottom: 2, opacity: 0.7 }}>{label}</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>{perfMetrics.throughput[k].toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LLM Stats */}
                        {perfMetrics.llm && Object.keys(perfMetrics.llm).length > 0 && (
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>LLM Statistics</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                    {[
                                        { k: 'total_llm_calls', label: 'Total Calls' },
                                        { k: 'successful_calls', label: 'Successful' },
                                        { k: 'failed_calls', label: 'Failed' },
                                        { k: 'success_rate_pct', label: 'Success Rate', suffix: '%' },
                                    ].map(({ k, label, suffix = '' }) => perfMetrics.llm[k] !== undefined && (
                                        <div key={k} style={{ background: 'var(--accent-glow)', borderRadius: 10, padding: 8, border: '1px solid var(--accent)', textAlign: 'center' }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 2, opacity: 0.7 }}>{label}</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{perfMetrics.llm[k].toLocaleString()}{suffix}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Redis */}
                        {perfMetrics.redis?.available && (
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>Redis</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                    {[
                                        { k: 'total_keys', label: 'Keys' },
                                        { k: 'used_memory_mb', label: 'Memory (MB)' },
                                        { k: 'connected_clients', label: 'Clients' },
                                        { k: 'total_commands_processed', label: 'Commands' },
                                    ].map(({ k, label }) => perfMetrics.redis[k] !== undefined && (
                                        <div key={k} style={{ background: 'var(--amber-dim)', borderRadius: 10, padding: 8, border: '1px solid var(--amber)', textAlign: 'center' }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--amber)', marginBottom: 2, opacity: 0.7 }}>{label}</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--amber)' }}>{perfMetrics.redis[k].toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DB Connection Pool */}
                        {perfMetrics.db_connection_pool && Object.keys(perfMetrics.db_connection_pool).length > 0 && (
                            <div>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 8 }}>DB Connection Pool</p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8 }}>
                                    {Object.entries(perfMetrics.db_connection_pool).map(([k, v]) => (
                                        <div key={k} style={{ background: 'var(--teal-dim)', borderRadius: 10, padding: 8, border: '1px solid var(--teal)', textAlign: 'center' }}>
                                            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'var(--teal)', marginBottom: 2, opacity: 0.7 }}>{k.replace(/_/g, ' ')}</p>
                                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal)' }}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>No metrics available yet</p>
                )}
            </Section>

            {/* Cache Stats */}
            <Section title="LLM Cache" icon={Database}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <ActionButton onClick={fetchCache} loading={cacheLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {cacheStats ? (
                    cacheStats.error ? (
                        <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>{cacheStats.error}</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                            {[
                                { k: 'cache_keys_count', label: 'Total Keys' },
                                { k: 'hit_rate_pct', label: 'Hit Rate', suffix: '%' },
                                { k: 'keyspace_hits', label: 'Hits' },
                                { k: 'keyspace_misses', label: 'Misses' },
                                { k: 'used_memory_mb', label: 'Memory (MB)' },
                                { k: 'peak_memory_mb', label: 'Peak (MB)' },
                                { k: 'evicted_keys', label: 'Evicted' },
                                { k: 'connected_clients', label: 'Clients' },
                            ].map(({ k, label, suffix = '' }) => cacheStats[k] !== undefined && (
                                <div key={k} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-lg)', padding: 12, border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 4 }}>{label}</p>
                                    <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{cacheStats[k].toLocaleString()}{suffix}</p>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: 16 }}>No cache data available</p>
                )}
            </Section>

            {/* Real-time Metrics */}
            {realtimeMetrics && Object.keys(realtimeMetrics).length > 0 && (
                <Section title="Real-time Counters" icon={Cpu}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
                        {Object.entries(realtimeMetrics).map(([key, val]) => (
                            <div key={key} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius-lg)', padding: 12, border: '1px solid var(--border)' }}>
                                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text3)', marginBottom: 4 }}>
                                    {key.replace(/_/g, ' ')}
                                </p>
                                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
                                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Database Cleanup */}
            <Section title="Database Cleanup" icon={Trash2}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <p style={{ fontSize: 13, color: 'var(--text2)' }}>Remove orphaned article records and placeholder content generated when all LLM providers were unavailable.</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {cleanupResult && (
                            <ResultBadge
                                ok={cleanupResult.ok}
                                text={cleanupResult.ok
                                    ? `${cleanupResult.data.orphaned_processed_articles_deleted} orphans + ${cleanupResult.data.fallback_content_deleted} fallback posts removed`
                                    : cleanupResult.data.error ?? 'Failed'}
                            />
                        )}
                        <ActionButton onClick={runCleanup} loading={cleanupLoading} variant="danger" icon={Trash2}>
                            Clean Up DB
                        </ActionButton>
                    </div>
                </div>
            </Section>

            {/* RSS Health Check */}
            <Section title="RSS Feed Health Check" icon={Activity}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                        Ping all active RSS feeds and deactivate any that are unreachable.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {rssHealthResult && (
                            <ResultBadge
                                ok={rssHealthResult.ok}
                                text={rssHealthResult.ok
                                    ? `${rssHealthResult.data.checked ?? '?'} checked, ${rssHealthResult.data.deactivated ?? 0} deactivated`
                                    : rssHealthResult.data.error ?? 'Failed'}
                            />
                        )}
                        <ActionButton
                            onClick={runRssHealthCheck}
                            loading={rssHealthLoading}
                            variant="outline"
                            icon={Activity}
                        >
                            Run Health Check
                        </ActionButton>
                    </div>
                </div>
            </Section>

            {/* Export */}
            <Section title="Export Content" icon={Download}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                        Download all generated content as a Markdown file.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {exportMsg && <ResultBadge ok={exportMsg.ok} text={exportMsg.text} />}
                        <ActionButton
                            onClick={runExport}
                            loading={exportLoading}
                            variant="outline"
                            icon={Download}
                        >
                            Export to Markdown
                        </ActionButton>
                    </div>
                </div>
            </Section>
        </div>
    );
}
