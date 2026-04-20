import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
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
            const response = await apiFetch('/integrations/webhooks');
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
            const response = await apiFetch('/integrations/webhooks', {
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
            await apiFetch(`integrations/webhooks/${id}`, { method: 'DELETE' });
            setSuccess('Webhook removed');
            fetchWebhooks();
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const handleToggleWebhook = async (id, enabled) => {
        try {
            await apiFetch(`integrations/webhooks/${id}/toggle`, {
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
            const response = await apiFetch('/integrations/test', { method: 'POST' });
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
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg3)' }}>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, lineHeight: 1.2 }}>
                        <Share2 style={{ width: 20, height: 20, color: 'var(--accent)' }} />
                        Webhooks
                    </h2>
                    <p style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                        Connect to Zapier, Slack, or custom endpoints
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={handleTestWebhook}
                        disabled={testing}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)',
                            background: 'var(--surface2)', color: 'var(--text)', fontSize: 12, fontWeight: 500,
                            cursor: 'pointer', opacity: testing ? 0.5 : 1,
                        }}
                    >
                        {testing ? <RefreshCw className="animate-spin" style={{ width: 14, height: 14 }} /> : <Play style={{ width: 14, height: 14 }} />}
                        Test Webhooks
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 12px', borderRadius: 8, border: '1px solid var(--accent)',
                            background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 500,
                            cursor: 'pointer',
                        }}
                    >
                        {isAdding ? 'Cancel' : <><Plus style={{ width: 14, height: 14 }} /> New Webhook</>}
                    </button>
                </div>
            </div>

            <div style={{ padding: 20 }}>
                {error && (
                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <AlertCircle style={{ width: 18, height: 18 }} />
                        <span style={{ fontSize: 12 }}>{error}</span>
                    </div>
                )}

                {success && (
                    <div style={{ marginBottom: 16, padding: 12, background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 8, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <CheckCircle2 style={{ width: 18, height: 18 }} />
                        <span style={{ fontSize: 12 }}>{success}</span>
                    </div>
                )}

                {isAdding && (
                    <form onSubmit={handleAddWebhook} style={{ marginBottom: 32, padding: 20, background: 'var(--bg3)', borderRadius: 12, border: '1px solid var(--border)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'block' }}>Webhook Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Zapier Workflow"
                                    value={newWebhook.name}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, name: e.target.value })}
                                    required
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--surface2)',
                                        color: 'var(--text)', fontSize: 12,
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'block' }}>Destination URL</label>
                                <input
                                    type="url"
                                    placeholder="https://hooks.zapier.com/..."
                                    value={newWebhook.url}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                                    required
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--surface2)',
                                        color: 'var(--text)', fontSize: 12,
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'block' }}>Secret Token (Optional)</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={newWebhook.secret}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--surface2)',
                                        color: 'var(--text)', fontSize: 12,
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 6, display: 'block' }}>Event Triggers (comma-separated)</label>
                                <input
                                    type="text"
                                    placeholder="pipeline_complete, error"
                                    value={newWebhook.events}
                                    onChange={(e) => setNewWebhook({ ...newWebhook, events: e.target.value })}
                                    style={{
                                        width: '100%', padding: '8px 12px', borderRadius: 8,
                                        border: '1px solid var(--border)', background: 'var(--surface2)',
                                        color: 'var(--text)', fontSize: 12,
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 24px', borderRadius: 8, border: '1px solid var(--accent)',
                                    background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                            >
                                Create Webhook
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                        <RefreshCw className="animate-spin" style={{ width: 32, height: 32, color: 'var(--accent)' }} />
                    </div>
                ) : webhooks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 48, background: 'var(--bg3)', borderRadius: 12, border: '2px dashed var(--border)' }}>
                        <Globe style={{ width: 48, height: 48, color: 'var(--text3)', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text2)', fontWeight: 500, fontSize: 13 }}>No webhooks configured.</p>
                        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, maxWidth: 300, margin: '8px auto 0' }}>
                            Webhooks allow you to push updates to other apps automatically when events occur.
                        </p>
                    </div>
                ) : (
                    <div className="pp-card" style={{ padding: '0 16px', display: 'flex', flexDirection: 'column' }}>
                        {webhooks.map((wh) => (
                            <div key={wh.id} className="webhook-row" style={{ opacity: wh.enabled ? 1 : 0.75 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{
                                        padding: 8, borderRadius: 8,
                                        background: wh.enabled ? 'var(--accent-glow)' : 'var(--bg3)',
                                        color: wh.enabled ? 'var(--accent)' : 'var(--text3)',
                                    }}>
                                        <Globe style={{ width: 16, height: 16 }} />
                                    </div>
                                    <div className="webhook-info">
                                        <span className="webhook-name">{wh.name}</span>
                                        <span className="webhook-url" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{wh.url}</span>
                                        {wh.events && (
                                            <div className="webhook-events">
                                                {wh.events.split(',').map(event => (
                                                    <span key={event} className="event-tag">
                                                        {event.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div 
                                        className={`toggle ${wh.enabled ? 'on' : 'off'}`} 
                                        onClick={() => handleToggleWebhook(wh.id, wh.enabled)} 
                                    />
                                    <button
                                        onClick={() => handleDeleteWebhook(wh.id)}
                                        className="pp-btn pp-btn-ghost"
                                        style={{ padding: 6, borderRadius: 8, border: 'none' }}
                                    >
                                        <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WebhookManager;
