import React, { useState, useEffect } from 'react';
import {
    Activity, CheckCircle, AlertCircle, Clock, RefreshCw, ShieldCheck,
    Database, Cpu, Zap, BarChart3, Flag, GitBranch, Server, TrendingDown
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

function StatCard({ label, value, sub, color = 'slate' }) {
    const colors = {
        green: 'bg-green-50 border-green-100 text-green-700',
        red: 'bg-red-50 border-red-100 text-red-700',
        amber: 'bg-amber-50 border-amber-100 text-amber-700',
        blue: 'bg-blue-50 border-blue-100 text-blue-700',
        slate: 'bg-slate-50 border-slate-100 text-slate-700',
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</p>
            <p className="text-2xl font-black">{value}</p>
            {sub && <p className="text-xs mt-1 opacity-70">{sub}</p>}
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
            const res = await fetch('/api/system/health');
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
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                <p className="text-gray-500 font-medium">Monitoring system vitals...</p>
            </div>
        );
    }

    if (error && !health) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <h3 className="text-xl font-bold text-gray-900">Health Check Failed</h3>
                <p className="text-red-500 bg-red-50 px-4 py-2 rounded-lg text-sm">{error}</p>
                <Button onClick={fetchHealth} variant="outline" icon={RefreshCw}>Try Again</Button>
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
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        System Health
                        {allOk
                            ? <ShieldCheck className="w-6 h-6 text-green-500" />
                            : services.length === 0
                                ? <AlertCircle className="w-6 h-6 text-gray-400" />
                                : <AlertCircle className="w-6 h-6 text-amber-500" />
                        }
                        {health?.stability_mode && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                Stability Mode
                            </span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}
                    </p>
                </div>
                <Button onClick={fetchHealth} variant="info" size="sm" icon={RefreshCw} loading={loading}>
                    Refresh
                </Button>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <Server className="w-4 h-4" /> System Vitals
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                        {/* Active Threads */}
                        {vitals.active_threads !== undefined && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Active Threads</p>
                                <p className="text-3xl font-black text-gray-800">{vitals.active_threads}</p>
                            </div>
                        )}

                        {/* Database */}
                        {vitals.database && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Database</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Connection Pool</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            vitals.database.connection_pool === 'healthy'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {vitals.database.connection_pool}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">DB Size</span>
                                        <span className="text-xs font-bold text-gray-700">
                                            {vitals.database.db_size_kb > 0
                                                ? `${(vitals.database.db_size_kb / 1024).toFixed(1)} MB`
                                                : 'PostgreSQL'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* LLM */}
                        {vitals.llm && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">LLM Circuit Breaker</p>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Status</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                            vitals.llm.circuit_breaker_tripped
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-green-100 text-green-700'
                                        }`}>
                                            {vitals.llm.circuit_breaker_tripped ? 'Tripped' : 'Healthy'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Failure Rate</span>
                                        <span className="text-xs font-bold text-gray-700">
                                            {(vitals.llm.failure_rate * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">Threshold</span>
                                        <span className="text-xs font-bold text-gray-700">
                                            {(vitals.llm.threshold * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Queue */}
                        {vitals.queue && (
                            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm md:col-span-2 lg:col-span-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                    Article Queue
                                    <span className="ml-2 text-indigo-600 normal-case font-bold">
                                        {vitals.queue.total_pending ?? 0} pending
                                    </span>
                                </p>
                                {vitals.queue.states && (
                                    <div className="space-y-1.5">
                                        {Object.entries(vitals.queue.states).map(([state, count]) => (
                                            <div key={state} className="flex items-center justify-between">
                                                <span className="text-xs text-gray-500 capitalize">{state}</span>
                                                <span className="text-xs font-bold text-gray-700 tabular-nums">{count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {vitals.queue.error && (
                                    <p className="text-xs text-red-500 mt-2">{vitals.queue.error}</p>
                                )}
                            </div>
                        )}

                    </div>
                </section>
            )}

            {/* Pipeline Error */}
            {pipeline.last_error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-red-800">Last Pipeline Error</p>
                        <p className="text-xs text-red-600 font-mono mt-1">{pipeline.last_error}</p>
                    </div>
                </div>
            )}

            {/* Service Cards */}
            <section>
                <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Pipeline Services ({services.length})
                </h2>
                {services.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-500">Waiting for first pipeline heartbeat</h3>
                        <p className="text-gray-400 max-w-sm mx-auto mt-2 text-sm">
                            Services appear here after the pipeline runs for the first time.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((service) => {
                            const name = service.service_name;
                            const total = (service.success_count || 0) + (service.failure_count || 0);
                            const successRate = total > 0
                                ? Math.round((service.success_count / total) * 100)
                                : null;

                            // Human-readable label
                            const labelMap = {
                                llm: 'LLM Router',
                                llm_groq: 'Groq',
                                llm_openrouter: 'OpenRouter',
                                llm_cerebras: 'Cerebras',
                                llm_local: 'Local (Ollama)',
                            };
                            const label = labelMap[name]
                                || name.replace('fetcher:', '').replace('processor:', '').replace(/_/g, ' ');

                            // Icon
                            const isLLM = name.startsWith('llm');
                            const isFetcher = name.includes('fetcher');
                            const IconEl = isLLM ? Zap : isFetcher ? Database : Cpu;
                            const iconColor = isLLM ? 'text-indigo-500' : isFetcher ? 'text-blue-600' : 'text-purple-600';

                            const isOk = service.status === 'ok';

                            return (
                                <div key={name} className={`bg-white p-5 rounded-xl shadow-sm border transition-all group ${
                                    isOk ? 'border-gray-100 hover:border-green-200' : 'border-red-100 hover:border-red-200'
                                }`}>
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${isOk ? 'bg-gray-50 group-hover:bg-indigo-50' : 'bg-red-50'} transition-colors`}>
                                            <IconEl className={`w-5 h-5 ${iconColor}`} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full flex items-center gap-1 ${
                                            isOk
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isOk ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {isOk ? 'OK' : 'Error'}
                                        </span>
                                    </div>

                                    {/* Name */}
                                    <h3 className="font-bold text-gray-800 capitalize mb-1">{label}</h3>

                                    {/* Last run */}
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                                        <Clock className="w-3 h-3" />
                                        <span>
                                            {service.last_run_at
                                                ? new Date(service.last_run_at).toLocaleString()
                                                : 'Never run'}
                                        </span>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex gap-6 mb-3">
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold">Successes</p>
                                            <p className="text-lg font-black text-gray-700">{service.success_count ?? 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] uppercase text-gray-400 font-bold">Failures</p>
                                            <p className="text-lg font-black text-red-500">{service.failure_count ?? 0}</p>
                                        </div>
                                        {successRate !== null && (
                                            <div>
                                                <p className="text-[10px] uppercase text-gray-400 font-bold">Success Rate</p>
                                                <p className={`text-lg font-black ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                                                    {successRate}%
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Success rate bar */}
                                    {successRate !== null && (
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3">
                                            <div
                                                className={`h-1.5 rounded-full transition-all ${
                                                    successRate >= 80 ? 'bg-green-500' : successRate >= 50 ? 'bg-amber-400' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${successRate}%` }}
                                            />
                                        </div>
                                    )}

                                    {/* Last error */}
                                    {service.last_error && (
                                        <div className="p-2.5 bg-red-50 rounded-lg border border-red-100">
                                            <p className="text-[10px] font-mono text-red-600 line-clamp-3 leading-relaxed" title={service.last_error}>
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
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <Flag className="w-4 h-4" /> Feature Flags
                        {disabledFeatures.length > 0 && (
                            <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                {disabledFeatures.length} disabled
                            </span>
                        )}
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.entries(featureFlags).map(([flag, enabled]) => (
                            <div key={flag} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium ${
                                enabled
                                    ? 'bg-green-50 border-green-100 text-green-700'
                                    : 'bg-red-50 border-red-100 text-red-600'
                            }`}>
                                {enabled
                                    ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                                    : <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                }
                                <span className="truncate">{flag.replace(/_/g, ' ')}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
