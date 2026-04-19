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
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                        Affiliate Link Manager
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Keywords will be automatically converted to affiliate links in generated content.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    {isAdding ? 'Cancel' : <><Plus className="w-4 h-4" /> Add Keyword</>}
                </button>
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
                    <form onSubmit={handleAddLink} className="mb-8 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium shadow-sm transition-all active:scale-95"
                            >
                                Save Affiliate Mapping
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <div className="flex justify-center py-12">
                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : links.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                        <DollarSign className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No affiliate links configured yet.</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Add keywords to start monetizing your content.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                                    <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Keyword</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Destination URL</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Usage</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {links.map((link) => (
                                    <tr key={link.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                        <td className="py-4 px-2 font-medium text-slate-900 dark:text-white">{link.keyword}</td>
                                        <td className="py-4 px-2">
                                            <a
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-sm max-w-[200px] truncate"
                                            >
                                                {link.url}
                                                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                            </a>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                {link.usage_count || 0} hits
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 text-right">
                                            <button
                                                onClick={() => handleDeleteLink(link.id)}
                                                className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                            >
                                                <Trash2 className="w-4 h-4" />
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
