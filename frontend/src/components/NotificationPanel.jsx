import React, { useEffect, useRef } from 'react';
import { X, Bell, CheckCircle, AlertCircle, Info, XCircle, Clock } from 'lucide-react';

export default function NotificationPanel({ isOpen, onClose, notifications = [], onRemoveNotification }) {
    const panelRef = useRef(null);

    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target) && isOpen) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'success':
                return CheckCircle;
            case 'error':
                return XCircle;
            case 'warning':
                return AlertCircle;
            default:
                return Info;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'success':
                return { bg: 'var(--green-dim)', border: 'var(--green)', text: 'var(--green)' };
            case 'error':
                return { bg: 'var(--red-dim)', border: 'var(--red)', text: 'var(--red)' };
            case 'warning':
                return { bg: 'var(--amber-dim)', border: 'var(--amber)', text: 'var(--amber)' };
            default:
                return { bg: 'var(--accent-glow)', border: 'var(--accent)', text: 'var(--accent)' };
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 150,
            pointerEvents: 'auto',
        }}>
            {/* Backdrop */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)',
                }}
                onClick={onClose}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className={`notif-panel ${isOpen ? 'open' : ''}`}
                style={{ zIndex: 151, top: 0, height: '100vh', padding: 0 }}
            >
                {/* Header */}
                <div className="notif-panel-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="notif-item-icon" style={{ background: 'var(--accent-glow)' }}>
                            <Bell style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <h2 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2,
                            }}>
                                Activity Feed
                            </h2>
                            <p className="notif-sub" style={{ marginTop: 2 }}>
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="pp-btn-ghost"
                        style={{ padding: 8, border: 'none', background: 'transparent' }}
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Notifications List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                        <div className="empty-state" style={{ color: 'var(--text3)' }}>
                            <Bell style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.5 }} />
                            <p className="empty-title">No notifications yet</p>
                            <p className="empty-sub">Activity will appear here</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {notifications.map((notification) => {
                                const Icon = getNotificationIcon(notification.type);
                                const colors = getNotificationColor(notification.type);

                                return (
                                    <div
                                        key={notification.id}
                                        className="notif-item"
                                        style={{ position: 'relative', background: colors.bg, borderBottomColor: colors.border }}
                                    >
                                        <button
                                            onClick={() => onRemoveNotification?.(notification.id)}
                                            style={{
                                                position: 'absolute', top: 8, right: 8,
                                                padding: 4, borderRadius: 6,
                                                border: 'none', background: 'transparent',
                                                color: colors.text, cursor: 'pointer',
                                                opacity: 0.6, transition: 'opacity 0.15s',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                            onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}
                                        >
                                            <X style={{ width: 14, height: 14 }} />
                                        </button>

                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div className="notif-item-icon" style={{ background: colors.border }}>
                                                <Icon style={{ width: 16, height: 16, color: colors.text }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                                                <h3 className="notif-title" style={{ color: colors.text, marginBottom: 4 }}>
                                                    {notification.title || notification.type}
                                                </h3>
                                                <p className="notif-sub" style={{ marginBottom: 8, whiteSpace: 'normal', lineHeight: 1.5 }}>
                                                    {notification.message || notification.content}
                                                </p>
                                                <div className="notif-time" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Clock style={{ width: 11, height: 11 }} />
                                                    {formatTime(notification.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: 16, borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                    <button
                        className="pp-btn pp-btn-ghost"
                        onClick={() => {
                            notifications.forEach(n => onRemoveNotification?.(n.id));
                        }}
                        disabled={notifications.length === 0}
                        style={{
                            width: '100%', justifyContent: 'center',
                            opacity: notifications.length === 0 ? 0.5 : 1,
                        }}
                    >
                        Clear All Notifications
                    </button>
                </div>
            </div>
        </div>
    );
}
