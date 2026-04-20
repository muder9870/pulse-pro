import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { DollarSign, Plus, Trash2, ExternalLink, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import Input from './ui/Input';

const MonetizationManager = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [newLink, setNewLink] = useState({ keyword: '', url: '' });
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const response = await apiFetch('/monetization/links');
            const data = await response.json();
            setLinks(data);
        } catch (err) {
            setError('Failed to fetch affiliate links');
        } finally {
            setLoading(false);
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        if (!newLink.keyword || !newLink.url) return;

        try {
            const response = await apiFetch('/monetization/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLink),
            });

            if (!response.ok) throw new Error('Failed to add link');

            setNewLink({ keyword: '', url: '' });
            setIsAdding(false);
            setSuccess('Affiliate link added successfully!');
            fetchLinks();
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleDeleteLink = async (id) => {
        if (!window.confirm('Are you sure you want to delete this affiliate link?')) return;

        try {
            const response = await apiFetch(`monetization/links/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete link');

            setSuccess('Link deleted');
            fetchLinks();
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(null), 3000);
        }
    };

    return (
        <div style={{ 
            background: 'var(--surface)', 
            borderRadius: 'var(--radius-lg)', 
            border: '1px solid var(--border)', 
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
            <div style={{ 
                padding: 24, 
                borderBottom: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                background: 'var(--surface2)'
            }}>
                <div>
                    <h2 style={{ 
                        fontSize: 20, 
                        fontWeight: 700, 
                        color: 'var(--text)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8 
                    }}>
                        <DollarSign style={{ width: 20, height: 20, color: 'var(--green)' }} />
                        Affiliate Link Manager
                    </h2>
                    <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
                        Keywords will be automatically converted to affiliate links in generated content.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 16px',
                        background: 'var(--accent)',
                        color: '#fff',
                        borderRadius: 10,
                        border: 'none',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'transform 0.1s'
                    }}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    {isAdding ? 'Cancel' : <><Plus style={{ width: 16, height: 16 }} /> Add Keyword</>}
                </button>
            </div>

            <div style={{ padding: 24 }}>
                {error && (
                    <div style={{ 
                        marginBottom: 16, 
                        padding: 16, 
                        background: 'var(--red-dim)', 
                        border: '1px solid var(--red)', 
                        color: 'var(--red)', 
                        borderRadius: 10, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12 
                    }}>
                        <AlertCircle style={{ width: 20, height: 20 }} />
                        <span style={{ fontSize: 13 }}>{error}</span>
                    </div>
                )}

                {success && (
                    <div style={{ 
                        marginBottom: 16, 
                        padding: 16, 
                        background: 'var(--green-dim)', 
                        border: '1px solid var(--green)', 
                        color: 'var(--green)', 
                        borderRadius: 10, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12 
                    }}>
                        <CheckCircle2 style={{ width: 20, height: 20 }} />
                        <span style={{ fontSize: 13 }}>{success}</span>
                    </div>
                )}

                {isAdding && (
                    <form onSubmit={handleAddLink} style={{ 
                        marginBottom: 32, 
                        padding: 16, 
                        background: 'var(--bg3)', 
                        borderRadius: 10, 
                        border: '1px solid var(--border)', 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: 16 
                    }}>
                        <Input
                            type="text"
                            label="Keyword / Brand Name"
                            placeholder="e.g. Ollama, NVIDIA, Pinecone"
                            value={newLink.keyword}
                            onChange={(e) => setNewLink({ ...newLink, keyword: e.target.value })}
                            required
                            fullWidth
                        />
                        <Input
                            type="url"
                            label="Affiliate / Custom URL"
                            placeholder="https://affiliate.example.com/ref=..."
                            value={newLink.url}
                            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                            required
                            fullWidth
                        />
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="submit"
                                style={{
                                    padding: '8px 24px',
                                    background: 'var(--accent)',
                                    color: '#fff',
                                    borderRadius: 10,
                                    border: 'none',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                }}
                                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                Save Affiliate Mapping
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                        <RefreshCw style={{ width: 32, height: 32, color: 'var(--accent)' }} className="animate-spin" />
                    </div>
                ) : links.length === 0 ? (
                    <div style={{ 
                        textAlign: 'center', 
                        padding: '48px 0', 
                        background: 'var(--bg3)', 
                        borderRadius: 'var(--radius-lg)', 
                        border: '2px dashed var(--border)' 
                    }}>
                        <DollarSign style={{ width: 48, height: 48, color: 'var(--border2)', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text2)', fontSize: 14 }}>No affiliate links configured yet.</p>
                        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Add keywords to start monetizing your content.</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>Keyword</th>
                                    <th style={{ paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>Destination URL</th>
                                    <th style={{ paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px' }}>Usage</th>
                                    <th style={{ paddingBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 8px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {links.map((link) => (
                                    <tr key={link.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '16px 8px', fontWeight: 600, color: 'var(--text)' }}>{link.keyword}</td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ 
                                                    color: 'var(--accent)', 
                                                    textDecoration: 'none', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    gap: 4, 
                                                    fontSize: 13, 
                                                    maxWidth: 200, 
                                                    overflow: 'hidden', 
                                                    textOverflow: 'ellipsis', 
                                                    whiteSpace: 'nowrap' 
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                            >
                                                {link.url}
                                                <ExternalLink style={{ width: 12, height: 12, flexShrink: 0 }} />
                                            </a>
                                        </td>
                                        <td style={{ padding: '16px 8px' }}>
                                            <span style={{ 
                                                display: 'inline-flex', 
                                                alignItems: 'center', 
                                                padding: '4px 8px', 
                                                borderRadius: 6, 
                                                background: 'var(--surface2)', 
                                                fontSize: 12, 
                                                fontWeight: 600, 
                                                color: 'var(--text2)', 
                                                border: '1px solid var(--border)' 
                                            }}>
                                                {link.usage_count || 0} hits
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px 8px', textAlign: 'right' }}>
                                            <button
                                                onClick={() => handleDeleteLink(link.id)}
                                                style={{ 
                                                    padding: 8, 
                                                    color: 'var(--text3)', 
                                                    background: 'transparent', 
                                                    border: 'none', 
                                                    borderRadius: 8, 
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => { 
                                                    e.currentTarget.style.color = 'var(--red)'; 
                                                    e.currentTarget.style.background = 'var(--red-dim)'; 
                                                }}
                                                onMouseLeave={(e) => { 
                                                    e.currentTarget.style.color = 'var(--text3)'; 
                                                    e.currentTarget.style.background = 'transparent'; 
                                                }}
                                            >
                                                <Trash2 style={{ width: 16, height: 16 }} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MonetizationManager;
