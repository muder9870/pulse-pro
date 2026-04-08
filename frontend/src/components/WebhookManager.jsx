import React, { useState, useEffect } from 'react';
import { Share2, Plus, Trash2, Globe, RefreshCw, AlertCircle, CheckCircle2, Shield, Activity, Play } from 'lucide-react';
import Input from './ui/Input';
import Checkbox from './ui/Checkbox';

const WebhookManager = () => {
    const [webhooks, setWebhooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [newWebhook, setNewWebhook] = useState({
        name: '',
        url: '',
        secret: '',
        events: 'pipeline_complete'
    });
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetchWebhooks();
    }, []);

    const fetchWebhooks = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/integrations/webhooks');
            const data = await response.json();
            setWebhooks(data);
        } catch (err) {
            setError('Failed to fetch webhooks');
        } finally {
            setLoading(false);
        }
    };

    const handleAddWebhook = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/integrations/webhooks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newWebhook),
            });

            if (!response.ok) throw new Error('Failed to add webhook');

            setNewWebhook({ name: '', url: '', secret: '', events: 'pipeline_complete' });
            setIsAdding(false);
            setSuccess('Webhook configured successfully!');
            fetchWebhooks();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleDeleteWebhook = async (id) => {
        if (!window.confirm('Delete this webhook?')) return;
        try {
            await fetch(`/api/integrations/webhooks/${id}`, { method: 'DELETE' });
            setSuccess('Webhook removed');
            fetchWebhooks();
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const handleToggleWebhook = async (id, enabled) => {
        try {
            await fetch(`/api/integrations/webhooks/${id}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !enabled }),
            });
            fetchWebhooks();
        } catch (err) {
            setError('Failed to toggle status');
        }
    };

    const handleTestWebhook = async () => {
        setTesting(true);
        try {
            const response = await fetch('/api/integrations/test', { method: 'POST' });
            if (!response.ok) throw new Error('Test failed');
            setSuccess('Test event dispatched to all enabled webhooks!');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError('Failed to trigger test');
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Share2 className="w-5 h-5 text-indigo-500" />
                        Outbound Webhooks
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Connect AI Pulse Pro to Zapier, Slack, or custom endpoints.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleTestWebhook}
                        disabled={testing}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                    >
                        {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        Test Webhooks
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                    >
                        {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> New Webhook</>}
                    </button>
                </div>
            </div>

            <div className="p-6">
                {error && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">{success}</span>
                    </div>
                )}

                {isAdding && (
                    <form onSubmit={handleAddWebhook} className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input
                                type="text"
                                label="Webhook Name"
                                placeholder="e.g. Zapier Workflow"
                                value={newWebhook.name}
                                onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                type="url"
                                label="Destination URL"
                                placeholder="https://hooks.zapier.com/..."
                                value={newWebhook.url}
                                onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                required
                                fullWidth
                            />
                            <Input
                                type="password"
                                label="Secret Token (Optional)"
                                placeholder="••••••••"
                                icon={Shield}
                                value={newWebhook.secret}
                                onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                fullWidth
                            />
                            <Input
                                type="text"
                                label="Event Triggers (comma-separated)"
                                placeholder="pipeline_complete, error"
                                icon={Activity}
                                value={newWebhook.events}
                                onChange={(e) => setNewWebhook({ ...newWebhook, events: e.target.value })}
                                fullWidth
                            />
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button
                                type="submit"
                                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-semibold shadow-md active:scale-95"
                            >
                                Create Webhook
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : webhooks.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <Globe className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">No webhooks configured.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
                            Webhooks allow you to push updates to other apps automatically when events occur in AI Pulse Pro.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {webhooks.map((wh) => (
                            <div key={wh.id} className={`p-5 rounded-xl border transition-all ${wh.enabled ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-75'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${wh.enabled ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-500'}`}>
                                            <Globe className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 dark:text-white">{wh.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{wh.url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="relative inline-flex items-center cursor-pointer scale-90">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={wh.enabled}
                                                onChange={() => handleToggleWebhook(wh.id, wh.enabled)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                        </label>
                                        <button
                                            onClick={() => handleDeleteWebhook(wh.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                {wh.events && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {wh.events.split(',').map(event => (
                                            <span key={event} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-full uppercase tracking-tight">
                                                {event.trim()}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebhookManager;
