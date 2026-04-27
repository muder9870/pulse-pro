import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import {
    Terminal, RefreshCw, Database, Activity,
    CheckCircle, AlertCircle, Clock, BarChart3, Cpu, Trash2,
    Play
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

    // ── Scheduler ─────────────────────────────────────────────────────────────
    const [scheduleInfo, setScheduleInfo] = useState(null);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleTime, setScheduleTime] = useState('09:00');
    const [scheduleDays, setScheduleDays] = useState(['mon', 'tue', 'wed', 'thu', 'fri']);
    const [scheduleEnabled, setScheduleEnabled] = useState(true);
    const [showScheduleConfig, setShowScheduleConfig] = useState(false);

    const fetchSchedule = async () => {
        try {
            const res = await apiFetch('/schedule');
            if (res.ok) {
                const data = await res.json();
                setScheduleInfo(data);
                // Update local state from server data
                if (data.schedule) {
                    setScheduleTime(data.schedule.time || '09:00');
                    setScheduleDays(data.schedule.days || ['mon', 'tue', 'wed', 'thu', 'fri']);
                    setScheduleEnabled(data.schedule.enabled !== false);
                }
            }
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

    const saveScheduleConfig = async () => {
        setScheduleLoading(true);
        try {
            const res = await apiFetch('/scheduler/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: scheduleEnabled,
                    days: scheduleDays,
                    time: scheduleTime
                })
            });
            
            if (res.ok) {
                await fetchSchedule();
                // Show success feedback (you can add a toast notification here)
            } else {
                const error = await res.json();
                console.error('Failed to save schedule config:', error);
            }
        } catch (e) {
            console.error('Failed to save schedule config:', e);
        } finally {
            setScheduleLoading(false);
        }
    };

    const toggleDay = (day) => {
        setScheduleDays(prev => 
            prev.includes(day) 
                ? prev.filter(d => d !== day)
                : [...prev, day]
        );
    };

    const dayOptions = [
        { key: 'mon', label: 'Mon' },
        { key: 'tue', label: 'Tue' },
        { key: 'wed', label: 'Wed' },
        { key: 'thu', label: 'Thu' },
        { key: 'fri', label: 'Fri' },
        { key: 'sat', label: 'Sat' },
        { key: 'sun', label: 'Sun' },
    ];

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
                        These tools directly affect the database and scheduler. Use with care.
                    </p>
                </div>
            </div>

            {/* Scheduler */}
            <Section title="Automation Scheduler" icon={Clock}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Status Display */}
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
                                    {scheduleInfo.schedule && (
                                        <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                                            Runs {scheduleInfo.schedule.days?.join(', ')} at {scheduleInfo.schedule.time}
                                        </p>
                                    )}
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
                        <ActionButton
                            onClick={() => setShowScheduleConfig(!showScheduleConfig)}
                            variant="outline"
                            icon={Clock}
                        >
                            {showScheduleConfig ? 'Hide Configuration' : 'Configure Schedule'}
                        </ActionButton>
                    </div>

                    {/* Collapsible Configuration Section */}
                    {showScheduleConfig && (
                        <div style={{ 
                            padding: 20, 
                            borderRadius: 10, 
                            background: 'var(--surface2)', 
                            border: '1px solid var(--border)',
                            animation: 'slideDown 0.2s ease-out'
                        }}>
                            <h4 style={{ 
                                fontSize: 11, 
                                fontWeight: 700, 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.05em', 
                                color: 'var(--text3)', 
                                marginBottom: 16 
                            }}>
                                Schedule Configuration
                            </h4>

                            {/* Enable/Disable Toggle */}
                            <label style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 12, 
                                cursor: 'pointer',
                                marginBottom: 20
                            }}>
                                <div style={{ 
                                    width: 44, 
                                    height: 26, 
                                    borderRadius: 13, 
                                    position: 'relative', 
                                    transition: 'background 0.2s', 
                                    background: scheduleEnabled ? 'var(--accent)' : 'var(--surface)', 
                                    border: '1px solid var(--border)', 
                                    flexShrink: 0 
                                }}>
                                    <div style={{ 
                                        position: 'absolute', 
                                        top: 3, 
                                        width: 18, 
                                        height: 18, 
                                        background: '#fff', 
                                        borderRadius: '50%', 
                                        transition: 'left 0.2s', 
                                        left: scheduleEnabled ? 22 : 3 
                                    }} />
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={scheduleEnabled} 
                                    onChange={(e) => setScheduleEnabled(e.target.checked)} 
                                    style={{ display: 'none' }} 
                                />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    Enable Automated Pipeline Runs
                                </span>
                            </label>

                            {/* Days Selection */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ 
                                    fontSize: 11, 
                                    fontWeight: 700, 
                                    color: 'var(--text3)', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: 10
                                }}>
                                    Active Days
                                </label>
                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(7, 1fr)', 
                                    gap: 6 
                                }}>
                                    {dayOptions.map((d) => (
                                        <button
                                            key={d.key}
                                            onClick={() => toggleDay(d.key)}
                                            style={{
                                                padding: '10px 0', 
                                                borderRadius: 10, 
                                                fontSize: 10, 
                                                fontWeight: 700,
                                                textTransform: 'uppercase', 
                                                cursor: 'pointer', 
                                                transition: 'all 0.15s',
                                                background: scheduleDays.includes(d.key) ? 'var(--accent)' : 'var(--surface)',
                                                border: `1px solid ${scheduleDays.includes(d.key) ? 'var(--accent)' : 'var(--border)'}`,
                                                color: scheduleDays.includes(d.key) ? '#fff' : 'var(--text2)',
                                            }}
                                        >
                                            {d.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Selection */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ 
                                    fontSize: 11, 
                                    fontWeight: 700, 
                                    color: 'var(--text3)', 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '0.05em',
                                    display: 'block',
                                    marginBottom: 10
                                }}>
                                    Run Time
                                </label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: 10,
                                        border: '1px solid var(--border)',
                                        background: 'var(--surface)',
                                        color: 'var(--text)',
                                        fontSize: 13,
                                        fontWeight: 600,
                                        fontFamily: 'var(--font-body)'
                                    }}
                                />
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <ActionButton
                                    onClick={saveScheduleConfig}
                                    loading={scheduleLoading}
                                    variant="primary"
                                    icon={CheckCircle}
                                >
                                    Save Configuration
                                </ActionButton>
                                <ActionButton
                                    onClick={() => toggleScheduler(scheduleEnabled)}
                                    loading={scheduleLoading}
                                    variant={scheduleEnabled ? 'success' : 'outline'}
                                    icon={scheduleEnabled ? Play : Activity}
                                >
                                    {scheduleEnabled ? 'Apply & Enable' : 'Apply & Disable'}
                                </ActionButton>
                            </div>
                        </div>
                    )}
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
        </div>
    );
}
