import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import packageJson from '../../package.json';
import {
    Home,
    Rss,
    BarChart2,
    Calendar,
    Image as ImageIcon,
    Mic,
    BookOpen,
    Activity,
    ChevronDown,
    ChevronRight,
    Database,
    Search,
    Settings,
    Shield,
    Zap,
    Award,
    X
} from 'lucide-react';

const Sidebar = React.memo(({ activeSource, setActiveSource, onSourceSelect, sources = [], isOpen, onClose, activeTheme }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentView = location.pathname.replace(/^\//, '') || 'dashboard';
    const [sourcesExpanded, setSourcesExpanded] = useState(true);

    // Focus trap for mobile drawer
    const sidebarRef = React.useRef(null);
    const previousFocusRef = React.useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            // Store previous focus
            previousFocusRef.current = document.activeElement;
            // Focus first focusable element
            const focusable = sidebarRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            focusable?.focus();
        } else if (previousFocusRef.current) {
            // Restore focus when closing
            previousFocusRef.current.focus();
        }
    }, [isOpen]);

    // Handle tab key for focus trap
    React.useEffect(() => {
        if (!isOpen) return;
        const handleTab = (e) => {
            if (e.key !== 'Tab') return;
            const focusableElements = sidebarRef.current?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (!focusableElements?.length) return;
            const first = focusableElements[0];
            const last = focusableElements[focusableElements.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    // Escape key closes mobile drawer
    React.useEffect(() => {
        if (!isOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const handleNavClick = (id) => {
        navigate(id === 'dashboard' ? '/' : `/${id}`);
        setActiveSource(null);
        if (onClose) onClose();
    };

    const mainNav = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'analytics', label: 'Metrics', icon: BarChart2 },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'media', label: 'Media Assets', icon: ImageIcon },
        { id: 'research', label: 'Research', icon: BookOpen },
        { id: 'podcast', label: 'Podcast', icon: Mic },
    ];

    const systemNav = [
        { id: 'settings', label: 'Settings Hub', icon: Settings },
    ];



    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[25] lg:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            <div ref={sidebarRef} className={`w-64 h-screen flex flex-col fixed left-0 top-0 z-[30] border-r shadow-2xl transition-all duration-500 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${activeTheme === 'dark' ? 'bg-[#0f172a] text-slate-300 border-slate-800/50' : 'bg-white text-slate-600 border-slate-200'}`}>

                {/* Brand Section */}
                <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg ring-1 ring-white/20">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className={`font-bold text-lg tracking-tight ${activeTheme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Pulse Pro</h1>
                            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest leading-none mt-1">AI Decision Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-2 text-slate-500 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-2 space-y-6">
                    {/* Main Navigation */}
                    <nav className="space-y-0.5">
                        <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-60">Main Menu</p>
                        {mainNav.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                aria-current={currentView === item.id && !activeSource ? 'page' : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${currentView === item.id && !activeSource
                                    ? 'bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20'
                                    : activeTheme === 'dark' 
                                        ? 'hover:bg-slate-800/50 hover:text-white' 
                                        : 'hover:bg-slate-200/70 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon className={`w-3.5 h-3.5 ${currentView === item.id && !activeSource ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Source Folders */}
                    <div className="space-y-0.5">
                        <button
                            onClick={() => setSourcesExpanded(!sourcesExpanded)}
                            className="w-full px-3 flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 hover:text-slate-300 transition-colors opacity-60"
                        >
                            <span>Source Folders</span>
                            {sourcesExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>

                        {sourcesExpanded && (
                            <div className="space-y-0.5 animate-fade-in">
                                <button
                                    onClick={() => { onSourceSelect(null); if (onClose) onClose(); }}
                                    className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${!activeSource && currentView === 'dashboard'
                                        ? 'text-indigo-400'
                                        : activeTheme === 'dark' 
                                            ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30' 
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                    }`}
                                >
                                    <Database className="w-3 h-3" />
                                    All Sources
                                </button>
                                {sources.map((source) => (
                                    <button
                                        key={typeof source === 'string' ? source : source.name}
                                        onClick={() => {
                                            const sourceName = typeof source === 'string' ? source : source.name;
                                            onSourceSelect(sourceName);
                                            if (onClose) onClose();
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${activeSource === (typeof source === 'string' ? source : source.name)
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                            : activeTheme === 'dark' 
                                                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30' 
                                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-1 h-1 rounded-full ${
                                                (typeof source === 'string' ? source : source.name).toLowerCase() === 'arxiv' ? 'bg-red-400' :
                                                (typeof source === 'string' ? source : source.name).toLowerCase() === 'github' ? 'bg-slate-400' :
                                                (typeof source === 'string' ? source : source.name).toLowerCase() === 'reddit' ? 'bg-orange-400' :
                                                (typeof source === 'string' ? source : source.name).toLowerCase() === 'gmail' ? 'bg-green-400' : 'bg-indigo-400'
                                            }`} />
                                            <span 
                                                className="capitalize truncate max-w-[100px]" 
                                                title={typeof source === 'string' ? source : source.name}
                                            >
                                                {typeof source === 'string' ? source : source.name}
                                            </span>
                                        </div>
                                        {source.count !== undefined && (
                                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                                                activeSource === (typeof source === 'string' ? source : source.name) ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                                            }`}>
                                                {source.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* System & Config */}
                    <nav className="space-y-0.5">
                        <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-60">System</p>
                        {systemNav.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item.id)}
                                aria-current={currentView === item.id ? 'page' : undefined}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${currentView === item.id
                                    ? 'bg-indigo-600/10 text-indigo-400 ring-1 ring-indigo-500/20'
                                    : activeTheme === 'dark' 
                                        ? 'hover:bg-slate-800/50 hover:text-white' 
                                        : 'hover:bg-slate-200/70 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon className={`w-3.5 h-3.5 ${currentView === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                {item.label}
                            </button>
                        ))}
                        

                    </nav>
                </div>

                {/* Footer / User / Global Actions */}
                <div className="p-4 bg-slate-900/50 border-t border-slate-800/50">
                    <div className="flex items-center gap-3 p-2 rounded-xl border border-slate-800/50 bg-slate-800/20">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                            <Award className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold text-white truncate">Pro Operator</p>
                            <p className="text-[10px] text-slate-500 truncate">v{packageJson.version}</p>
                        </div>
                        <button className="text-slate-500 hover:text-white transition-colors" onClick={() => handleNavClick('settings')}>
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
