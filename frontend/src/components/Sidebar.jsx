import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import packageJson from '../../package.json';
import {
    Home,
    BookOpen,
    BarChart2,
    Calendar,
    Image as ImageIcon,
    Mic,
    Search,
    Settings,
    ChevronDown,
    ChevronRight,
    Zap,
    X
} from 'lucide-react';

const SOURCE_COLORS = {
    arxiv:  '#EF4444',
    github: '#8A96B0',
    reddit: '#F59E0B',
    gmail:  '#10B981',
    rss:    '#6C63FF',
};

function getSourceColor(name = '') {
    const key = name.toLowerCase();
    for (const [k, v] of Object.entries(SOURCE_COLORS)) {
        if (key.includes(k)) return v;
    }
    // cycle through accent colors for unknown sources
    const palette = ['#6C63FF','#00D4A8','#EC4899','#F59E0B','#8B5CF6','#10B981'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
}

const Sidebar = React.memo(({ activeSource, setActiveSource, onSourceSelect, sources = [], isOpen, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentView = location.pathname.replace(/^\//, '') || 'dashboard';
    const [sourcesExpanded, setSourcesExpanded] = useState(true);

    // Focus trap refs
    const sidebarRef = React.useRef(null);
    const previousFocusRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement;
            const focusable = sidebarRef.current?.querySelector('button, [href], input, [tabindex]:not([tabindex="-1"])');
            focusable?.focus();
        } else if (previousFocusRef.current) {
            previousFocusRef.current.focus();
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            const els = sidebarRef.current?.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
            if (!els?.length) return;
            const first = els[0], last = els[els.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleNavClick = (id) => {
        navigate(id === 'dashboard' ? '/' : `/${id}`);
        setActiveSource(null);
        if (onClose) onClose();
    };

    const mainNav = [
        { id: 'dashboard', label: 'Dashboard',    icon: Home },
        { id: 'articles',  label: 'Articles',     icon: BookOpen,  badge: null },
        { id: 'analytics', label: 'Metrics',      icon: BarChart2 },
        { id: 'calendar',  label: 'Calendar',     icon: Calendar },
        { id: 'media',     label: 'Media Assets', icon: ImageIcon },
        { id: 'research',  label: 'Research',     icon: Search },
        { id: 'podcast',   label: 'Podcast',      icon: Mic },
    ];

    const isActive = (id) => currentView === id && !activeSource;

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[25] lg:hidden"
                    style={{ background: 'rgba(0,0,0,0.7)' }}
                    onClick={onClose}
                />
            )}

            <aside
                ref={sidebarRef}
                className={`fixed left-0 top-0 z-[30] flex flex-col h-screen overflow-y-auto transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                    width: 'var(--sidebar-w)',
                    minWidth: 'var(--sidebar-w)',
                    background: 'var(--bg2)',
                    borderRight: '1px solid var(--border)',
                }}
            >
                {/* Logo */}
                <div
                    className="flex items-center gap-2.5 flex-shrink-0"
                    style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}
                >
                    <div
                        className="flex items-center justify-center flex-shrink-0 text-base"
                        style={{
                            width: 32, height: 32,
                            background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                            borderRadius: 8,
                        }}
                    >
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                            Pulse Pro
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                            AI Decision Engine
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden flex-shrink-0"
                        style={{ color: 'var(--text3)' }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable nav area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ padding: '14px 10px 6px' }}>

                    {/* Main Menu */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>
                            Main Menu
                        </div>
                        {mainNav.map((item) => {
                            const active = isActive(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className="w-full flex items-center gap-2.5 relative"
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        marginBottom: 1,
                                        fontSize: 13,
                                        fontWeight: active ? 500 : 400,
                                        color: active ? 'var(--accent)' : 'var(--text2)',
                                        background: active ? 'var(--accent-glow)' : 'transparent',
                                        transition: 'all 0.15s',
                                        cursor: 'pointer',
                                        border: 'none',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; } }}
                                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; } }}
                                >
                                    {/* Active left bar */}
                                    {active && (
                                        <span
                                            style={{
                                                position: 'absolute', left: 0, top: '50%',
                                                transform: 'translateY(-50%)',
                                                width: 3, height: 16,
                                                background: 'var(--accent)',
                                                borderRadius: '0 2px 2px 0',
                                            }}
                                        />
                                    )}
                                    <item.icon
                                        style={{
                                            width: 16, height: 16,
                                            opacity: active ? 1 : 0.7,
                                            flexShrink: 0,
                                            color: active ? 'var(--accent)' : 'currentColor',
                                        }}
                                    />
                                    <span className="flex-1">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Source Folders */}
                    <div style={{ marginBottom: 20 }}>
                        <button
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            className="w-full flex items-center justify-between"
                            style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <span>Source Folders</span>
                            {sourcesExpanded
                                ? <ChevronDown style={{ width: 12, height: 12 }} />
                                : <ChevronRight style={{ width: 12, height: 12 }} />
                            }
                        </button>

                        {sourcesExpanded && (
                            <>
                                {/* All Sources */}
                                <button
                                    onClick={() => { onSourceSelect(null); if (onClose) onClose(); }}
                                    className="w-full flex items-center gap-2"
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: 6,
                                        marginBottom: 1,
                                        fontSize: 12,
                                        color: !activeSource ? 'var(--text)' : 'var(--text2)',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = !activeSource ? 'var(--text)' : 'var(--text2)'; }}
                                >
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0, display: 'inline-block' }} />
                                    <span className="flex-1">All Sources</span>
                                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text3)', marginLeft: 'auto' }}>
                                        {sources.reduce((acc, s) => acc + (s.count || 0), 0) || ''}
                                    </span>
                                </button>

                                {sources.map((source) => {
                                    const name = typeof source === 'string' ? source : source.name;
                                    const count = source.count;
                                    const color = getSourceColor(name);
                                    const isActiveSrc = activeSource === name;
                                    return (
                                        <button
                                            key={name}
                                            onClick={() => { onSourceSelect(name); if (onClose) onClose(); }}
                                            className="w-full flex items-center gap-2"
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: 6,
                                                marginBottom: 1,
                                                fontSize: 12,
                                                color: isActiveSrc ? 'var(--text)' : 'var(--text2)',
                                                background: isActiveSrc ? 'var(--surface)' : 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.15s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = isActiveSrc ? 'var(--surface)' : 'transparent'; e.currentTarget.style.color = isActiveSrc ? 'var(--text)' : 'var(--text2)'; }}
                                        >
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
                                            <span className="flex-1 truncate capitalize" title={name} style={{ maxWidth: 110 }}>{name}</span>
                                            {count !== undefined && (
                                                <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: isActiveSrc ? color : 'var(--text3)', marginLeft: 'auto' }}>
                                                    {count}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>

                    {/* System */}
                    <div>
                        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', color: 'var(--text3)', textTransform: 'uppercase', padding: '0 8px', marginBottom: 4 }}>
                            System
                        </div>
                        {[{ id: 'settings', label: 'Settings Hub', icon: Settings }].map((item) => {
                            const active = isActive(item.id);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    aria-current={active ? 'page' : undefined}
                                    className="w-full flex items-center gap-2.5 relative"
                                    style={{
                                        padding: '7px 10px',
                                        borderRadius: 8,
                                        marginBottom: 1,
                                        fontSize: 13,
                                        fontWeight: active ? 500 : 400,
                                        color: active ? 'var(--accent)' : 'var(--text2)',
                                        background: active ? 'var(--accent-glow)' : 'transparent',
                                        transition: 'all 0.15s',
                                        cursor: 'pointer',
                                        border: 'none',
                                        textAlign: 'left',
                                    }}
                                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; } }}
                                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)'; } }}
                                >
                                    {active && (
                                        <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 16, background: 'var(--accent)', borderRadius: '0 2px 2px 0' }} />
                                    )}
                                    <item.icon style={{ width: 16, height: 16, opacity: active ? 1 : 0.7, flexShrink: 0, color: active ? 'var(--accent)' : 'currentColor' }} />
                                    <span className="flex-1">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom user card */}
                <div
                    className="flex-shrink-0"
                    style={{ padding: 12, borderTop: '1px solid var(--border)' }}
                >
                    <button
                        onClick={() => handleNavClick('settings')}
                        className="w-full flex items-center gap-2.5"
                        style={{
                            padding: '8px 10px',
                            borderRadius: 8,
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                        {/* Avatar */}
                        <div
                            className="flex items-center justify-center flex-shrink-0 text-white"
                            style={{
                                width: 28, height: 28,
                                borderRadius: 8,
                                background: 'linear-gradient(135deg, var(--accent), var(--pink))',
                                fontSize: 11, fontWeight: 700,
                            }}
                        >
                            PO
                        </div>
                        <div className="flex-1 min-w-0">
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Pro Operator</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)' }}>v{packageJson.version}</div>
                        </div>
                        <ChevronRight style={{ width: 12, height: 12, color: 'var(--text3)', flexShrink: 0 }} />
                    </button>
                </div>
            </aside>
        </>
    );
});

Sidebar.displayName = 'Sidebar';
export default Sidebar;
