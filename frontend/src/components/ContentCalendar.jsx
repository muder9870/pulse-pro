import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, AlertCircle, RefreshCw, Trash2, ExternalLink, GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ContentCalendar() {
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDragging, setIsDragging] = useState(false);

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const fetchQueue = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/schedule/list');
            const data = await res.json();
            if (res.ok) {
                setPosts(data.posts || []);
            } else {
                setError(data.error || 'Failed to load queue');
            }
        } catch (err) {
            setError('Connection failed');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
    }, []);

    const getStatusStyle = (status) => {
        switch (status) {
            case 'posted': return 'text-green-600 bg-green-50 border-green-100';
            case 'failed': return 'text-red-600 bg-red-50 border-red-100';
            default: return 'text-blue-600 bg-blue-50 border-blue-100';
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-slate-200 rounded-xl w-48" />
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-20 bg-slate-100 rounded-2xl border border-slate-200" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Header with date navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">Content Calendar</h1>
                    <p className="text-sm text-gray-500">View and manage your automated posting queue</p>
                </div>
                
                {/* Date navigation with today highlight */}
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-1">
                    <button 
                        onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        isToday(selectedDate) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                    }`}>
                        {isToday(selectedDate) ? 'Today' : selectedDate.toLocaleDateString()}
                    </div>
                    <button 
                        onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
                
                <button
                    onClick={fetchQueue}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {/* Drag affordance hint */}
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <GripVertical className="w-4 h-4" />
                <span>Drag posts to reschedule (drag and drop coming soon)</span>
            </div>

            {posts.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-xl border border-dashed border-gray-300">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium text-lg">Your queue is empty</p>
                    <p className="text-gray-400 text-sm mt-1">Generate content and click "Schedule" to see it here.</p>
                </div>
            ) : (
                <div className="grid gap-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {posts.map((post, index) => (
                        <div 
                            key={post.id} 
                            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing"
                            draggable
                            onDragStart={() => setIsDragging(true)}
                            onDragEnd={() => setIsDragging(false)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusStyle(post.status)}`}>
                                                {post.status}
                                            </span>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{post.platform}</span>
                                        </div>
                                        <h3 className="font-bold text-gray-800 text-lg leading-tight">{post.article_title}</h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4" />
                                                <span>{new Date(post.scheduled_time).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 shrink-0">
                                    <button className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {post.error_message && (
                                <div className="mt-4 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex gap-2 items-start">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{post.error_message}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
