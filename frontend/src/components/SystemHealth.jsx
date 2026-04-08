import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock, RefreshCw, ArrowLeft, ShieldCheck, Database, Cpu } from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

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
        const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    if (loading && !health) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Activity className="w-8 h-8 text-blue-500 animate-pulse" />
                <p className="text-gray-500 font-medium tracking-tight">Monitoring system vitals...</p>
            </div>
        );
    }

    if (error && !health) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AlertCircle className="w-10 h-10 text-red-500" />
                <h3 className="text-xl font-bold text-gray-900">Health Check Failed</h3>
                <p className="text-red-500 font-medium bg-red-50 px-4 py-2 rounded-lg">{error}</p>
                <Button onClick={fetchHealth} variant="outline" icon={RefreshCw} className="mt-4">
                    Try Again
                </Button>
            </div>
        );
    }

    const services = health?.services || [];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={onBack}
                        variant="ghost"
                        size="sm"
                        icon={ArrowLeft}
                        className="rounded-full"
                    />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            System Health
                            {services.length > 0 && services.every(s => s.status === 'ok') ? (
                                <ShieldCheck className="w-6 h-6 text-green-500" />
                            ) : services.length === 0 ? (
                                <AlertCircle className="w-6 h-6 text-gray-400" />
                            ) : (
                                <AlertCircle className="w-6 h-6 text-amber-500" />
                            )}
                        </h1>
                        <p className="text-sm text-gray-500">Real-time status of pipeline services and LLM providers</p>
                    </div>
                </div>
                <Button
                    onClick={fetchHealth}
                    variant="info"
                    size="sm"
                    icon={RefreshCw}
                    loading={loading}
                >
                    Refresh Status
                </Button>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map((service) => (
                    <div key={service.service_name} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-gray-200 transition-all group">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
                                {service.service_name.includes('fetcher') ? <Database className="w-5 h-5 text-blue-600" /> : <Cpu className="w-5 h-5 text-purple-600" />}
                            </div>
                            <Badge 
                                variant={service.status === 'ok' ? 'success' : 'danger'}
                                size="sm"
                                dot
                            >
                                {service.status === 'ok' ? 'Running' : 'Failure'}
                            </Badge>
                        </div>

                        <h3 className="font-bold text-gray-800 capitalize mb-1 truncate">
                            {service.service_name.replace('fetcher:', '').replace('processor:', '')}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Last run: {new Date(service.last_run_at).toLocaleString()}</span>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-gray-50">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Successes</span>
                                <span className="text-sm font-bold text-gray-700">{service.success_count}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-gray-400 font-bold">Failures</span>
                                <span className="text-sm font-bold text-red-500">{service.failure_count}</span>
                            </div>
                        </div>

                        {service.last_error && (
                            <div className="mt-4 p-3 bg-red-50/50 rounded-lg border border-red-50">
                                <p className="text-[10px] font-mono text-red-600 line-clamp-2" title={service.last_error}>
                                    Error: {service.last_error}
                                </p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {services.length === 0 && !loading && (
                <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-500">Waiting for first pipeline heartbeat</h3>
                    <p className="text-gray-400 max-w-sm mx-auto mt-2">Services will appear here once the automated pipeline or a manual trigger completes its first run.</p>
                </div>
            )}
        </div>
    );
}
