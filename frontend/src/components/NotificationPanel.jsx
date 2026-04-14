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
            position: 'fixed', inset: 0, zIndex: 50,
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
                style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: 400, maxWidth: '90vw',
                    background: 'var(--surface)',
                    borderLeft: '1px solid var(--border)',
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.3s ease-out',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--surface2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'var(--accent-glow)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Bell style={{ width: 18, height: 18, color: 'var(--accent)' }} />
                        </div>
                        <div>
                            <h2 style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 16, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2,
                            }}>
                                Activity Feed
                            </h2>
                            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            padding: 8, borderRadius: 8,
                            border: 'none', background: 'transparent',
                            color: 'var(--text2)', cursor: 'pointer',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg3)';
                            e.currentTarget.style.color = 'var(--text)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text2)';
                        }}
                    >
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Notifications List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {notifications.length === 0 ? (
                        <div style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            justifyContent: 'center', padding: 48, color: 'var(--text3)',
                        }}>
                            <Bell style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.5 }} />
                            <p style={{ fontSize: 13, fontWeight: 500 }}>No notifications yet</p>
                            <p style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
                                Activity will appear here
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {notifications.map((notification) => {
                                const Icon = getNotificationIcon(notification.type);
                                const colors = getNotificationColor(notification.type);

                                return (
                                    <div
                                        key={notification.id}
                                        style={{
                                            padding: 16,
                                            borderRadius: 12,
                                            border: `1px solid ${colors.border}`,
                                            background: colors.bg,
                                            position: 'relative',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        {/* Remove button */}
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

                                        {/* Content */}
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 8,
                                                background: colors.border,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                <Icon style={{ width: 16, height: 16, color: colors.text }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0, paddingRight: 20 }}>
                                                <h3 style={{
                                                    fontSize: 13, fontWeight: 600,
                                                    color: colors.text, marginBottom: 4,
                                                }}>
                                                    {notification.title || notification.type}
                                                </h3>
                                                <p style={{
                                                    fontSize: 12, color: 'var(--text2)',
                                                    lineHeight: 1.5, marginBottom: 8,
                                                }}>
                                                    {notification.message || notification.content}
                                                </p>
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                    fontSize: 10, color: 'var(--text3)',
                                                }}>
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
                <div style={{
                    padding: 16,
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface2)',
                }}>
                    <button
                        onClick={() => {
                            notifications.forEach(n => onRemoveNotification?.(n.id));
                        }}
                        disabled={notifications.length === 0}
                        style={{
                            width: '100%', padding: '10px 16px', borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--text)',
                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                            transition: 'all 0.15s',
                            opacity: notifications.length === 0 ? 0.5 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (notifications.length > 0) {
                                e.currentTarget.style.background = 'var(--bg3)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--surface)';
                        }}
                    >
                        Clear All Notifications
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }
            `}</style>
        </div>
    );
}
