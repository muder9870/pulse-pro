import React, { useState, useEffect } from 'react';
import {
    Terminal, RefreshCw, Download, Zap, Database, Activity,
    CheckCircle, AlertCircle, Clock, BarChart3, Cpu, Trash2,
    Play, ChevronDown, ChevronUp, Key, ExternalLink
} from 'lucide-react';

// ─── Small helpers ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                <Icon className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">{title}</h3>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function ActionButton({ onClick, loading, disabled, variant = 'primary', icon: Icon, children }) {
    const base = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
    const variants = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200',
        danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm shadow-red-200',
        outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200',
    };
    return (
        <button onClick={onClick} disabled={disabled || loading} className={`${base} ${variants[variant]}`}>
            {loading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : Icon && <Icon className="w-4 h-4" />
            }
            {children}
        </button>
    );
}

function ResultBadge({ ok, text }) {
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
            ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
            {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
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
            const res = await fetch('/api/system/llm-providers');
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
            const res = await fetch('/api/pipeline/status');
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
            const res = await fetch('/api/pipeline/run', { method: 'POST' });
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
            const res = await fetch('/api/performance/metrics');
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
            const res = await fetch('/api/performance/cache-stats');
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
            const res = await fetch('/api/metrics/realtime');
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
            const res = await fetch('/api/system/cleanup-orphans', { method: 'POST' });
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
            const res = await fetch('/api/rss/health-check', { method: 'POST' });
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
            const res = await fetch('/api/export?format=csv&limit=500');
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
            const res = await fetch('/api/schedule');
            if (res.ok) setScheduleInfo(await res.json());
        } catch { /* silent */ }
    };

    useEffect(() => { fetchSchedule(); }, []);

    const toggleScheduler = async (enable) => {
        setScheduleLoading(true);
        try {
            await fetch(`/api/scheduler/${enable ? 'enable' : 'disable'}`, { method: 'POST' });
            await fetchSchedule();
        } catch { /* silent */ } finally {
            setScheduleLoading(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    const isDark = activeTheme === 'dark';

    return (
        <div className="space-y-6">
            {/* Warning banner */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Terminal className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                    <p className="text-sm font-bold text-amber-800">Developer & Operations Tools</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                        These tools directly affect the pipeline, database, and scheduler. Use with care.
                    </p>
                </div>
            </div>

            {/* LLM Provider Status */}
            <Section title="LLM Providers" icon={Key}>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-500">
                        {llmProviders
                            ? `${llmProviders.configured_count} of ${llmProviders.total_count} providers configured`
                            : 'Loading…'}
                    </p>
                    <ActionButton onClick={fetchLlmProviders} loading={llmLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {llmProviders?.providers ? (
                    <div className="space-y-2">
                        {llmProviders.providers.map(p => (
                            <div key={p.name} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                                p.configured
                                    ? 'bg-green-50 border-green-100'
                                    : 'bg-slate-50 border-slate-100'
                            }`}>
                                <div className="flex items-center gap-3 min-w-0">
                                    {p.configured
                                        ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                                        : <AlertCircle className="w-4 h-4 text-slate-300 shrink-0" />
                                    }
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${p.configured ? 'text-slate-800' : 'text-slate-400'}`}>
                                                {p.name}
                                            </span>
                                            {p.free && (
                                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                    Free
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 truncate">{p.model}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    {!p.configured && p.get_key_url && (
                                        <a
                                            href={p.get_key_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                            Get Key <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {p.configured && (
                                        <span className="text-[10px] font-bold text-green-600">Configured</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">Loading provider status…</p>
                )}
            </Section>

            {/* Pipeline Control */}
            <Section title="Pipeline Control" icon={Play}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${
                                pipelineStatus?.running ? 'bg-orange-500 animate-pulse' :
                                pipelineStatus?.status === 'error' ? 'bg-red-500' : 'bg-green-500'
                            }`} />
                            <span className="text-sm font-bold text-slate-700 capitalize">
                                {pipelineStatus?.status ?? 'Unknown'}
                            </span>
                        </div>
                        {pipelineStatus?.last_finished_at && (
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Last run: {new Date(pipelineStatus.last_finished_at).toLocaleString()}
                            </p>
                        )}
                        {pipelineStatus?.last_error && (
                            <p className="text-xs text-red-500 font-mono max-w-sm truncate" title={pipelineStatus.last_error}>
                                {pipelineStatus.last_error}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="space-y-1">
                        {scheduleInfo ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${scheduleInfo.running ? 'bg-green-500' : 'bg-slate-300'}`} />
                                    <span className="text-sm font-bold text-slate-700">
                                        {scheduleInfo.running ? 'Active' : 'Stopped'}
                                    </span>
                                </div>
                                {scheduleInfo.next_run_time && (
                                    <p className="text-xs text-slate-400">
                                        Next run: {new Date(scheduleInfo.next_run_time).toLocaleString()}
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-slate-400">Loading scheduler status…</p>
                        )}
                    </div>
                    <div className="flex gap-2">
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
                <div className="flex justify-end mb-4">
                    <ActionButton onClick={fetchPerf} loading={perfLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {perfMetrics ? (
                    <div className="space-y-4">
                        {/* Throughput */}
                        {perfMetrics.throughput && Object.keys(perfMetrics.throughput).length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Article Throughput</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { k: 'articles_last_1h', label: 'Articles (1h)' },
                                        { k: 'articles_last_24h', label: 'Articles (24h)' },
                                        { k: 'analyzed_last_24h', label: 'Analyzed (24h)' },
                                        { k: 'content_last_24h', label: 'Content (24h)' },
                                        { k: 'total_articles', label: 'Total Articles' },
                                        { k: 'total_analyzed', label: 'Total Analyzed' },
                                        { k: 'total_content_generated', label: 'Total Content' },
                                    ].map(({ k, label }) => perfMetrics.throughput[k] !== undefined && (
                                        <div key={k} className="bg-emerald-50 rounded-lg p-2 border border-emerald-100 text-center">
                                            <p className="text-[9px] font-bold uppercase text-emerald-400 mb-0.5">{label}</p>
                                            <p className="text-sm font-black text-emerald-700">{perfMetrics.throughput[k].toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LLM Stats */}
                        {perfMetrics.llm && Object.keys(perfMetrics.llm).length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">LLM Statistics</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { k: 'total_llm_calls', label: 'Total Calls' },
                                        { k: 'successful_calls', label: 'Successful' },
                                        { k: 'failed_calls', label: 'Failed' },
                                        { k: 'success_rate_pct', label: 'Success Rate', suffix: '%' },
                                    ].map(({ k, label, suffix = '' }) => perfMetrics.llm[k] !== undefined && (
                                        <div key={k} className="bg-indigo-50 rounded-lg p-2 border border-indigo-100 text-center">
                                            <p className="text-[9px] font-bold uppercase text-indigo-400 mb-0.5">{label}</p>
                                            <p className="text-sm font-black text-indigo-700">{perfMetrics.llm[k].toLocaleString()}{suffix}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Redis */}
                        {perfMetrics.redis?.available && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Redis</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {[
                                        { k: 'total_keys', label: 'Keys' },
                                        { k: 'used_memory_mb', label: 'Memory (MB)' },
                                        { k: 'connected_clients', label: 'Clients' },
                                        { k: 'total_commands_processed', label: 'Commands' },
                                    ].map(({ k, label }) => perfMetrics.redis[k] !== undefined && (
                                        <div key={k} className="bg-orange-50 rounded-lg p-2 border border-orange-100 text-center">
                                            <p className="text-[9px] font-bold uppercase text-orange-400 mb-0.5">{label}</p>
                                            <p className="text-sm font-black text-orange-700">{perfMetrics.redis[k].toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* DB Connection Pool */}
                        {perfMetrics.db_connection_pool && Object.keys(perfMetrics.db_connection_pool).length > 0 && (
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">DB Connection Pool</p>
                                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                                    {Object.entries(perfMetrics.db_connection_pool).map(([k, v]) => (
                                        <div key={k} className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                                            <p className="text-[9px] font-bold uppercase text-blue-400 mb-0.5">{k.replace(/_/g, ' ')}</p>
                                            <p className="text-sm font-black text-blue-700">{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No metrics available yet</p>
                )}
            </Section>

            {/* Cache Stats */}
            <Section title="LLM Cache" icon={Database}>
                <div className="flex justify-end mb-4">
                    <ActionButton onClick={fetchCache} loading={cacheLoading} variant="outline" icon={RefreshCw}>
                        Refresh
                    </ActionButton>
                </div>
                {cacheStats ? (
                    cacheStats.error ? (
                        <p className="text-sm text-slate-400 text-center py-4">{cacheStats.error}</p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                                <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
                                    <p className="text-lg font-black text-slate-700">{cacheStats[k].toLocaleString()}{suffix}</p>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No cache data available</p>
                )}
            </Section>

            {/* Real-time Metrics */}
            {realtimeMetrics && Object.keys(realtimeMetrics).length > 0 && (
                <Section title="Real-time Counters" icon={Cpu}>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(realtimeMetrics).map(([key, val]) => (
                            <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                    {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-lg font-black text-slate-700">
                                    {typeof val === 'number' ? val.toLocaleString() : String(val)}
                                </p>
                            </div>
                        ))}
                    </div>
                </Section>
            )}

            {/* Database Cleanup */}
            <Section title="Database Cleanup" icon={Trash2}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <p className="text-sm text-slate-500">Remove orphaned article records and placeholder content generated when all LLM providers were unavailable.</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm text-slate-500">
                        Ping all active RSS feeds and deactivate any that are unreachable.
                    </p>
                    <div className="flex items-center gap-3">
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
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm text-slate-500">
                        Download all generated content as a Markdown file.
                    </p>
                    <div className="flex items-center gap-3">
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
