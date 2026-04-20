import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    DollarSign, Activity, Share2, Chrome, Rss, UserCheck,
    Settings, ChevronRight, Shield, Zap, Layout, Terminal, Tag
} from 'lucide-react';

/* Import setting modules directly */
import MonetizationManager from './MonetizationManager';
import SystemHealth from './SystemHealth';
import WebhookManager from './WebhookManager';
import ExtensionHelp from './ExtensionHelp';
import RSSManager from './RSSManager';
import StyleProfile from './StyleProfile';
import ThemeSelector from './ThemeSelector';
import AdvancedTools from './AdvancedTools';
import KeywordsManager from './KeywordsManager';
import LLMProviders from './LLMProviders';

const SettingsView = ({ initialTab = 'monetization', activeTheme }) => {
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Read tab from URL query param, fallback to initialTab prop
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(urlTab || initialTab);
    
    // Sync URL when tab changes
    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId }, { replace: true });
    };
    
    // Sync state when URL changes (e.g., back/forward navigation)
    useEffect(() => {
        if (urlTab && urlTab !== activeTab) {
            setActiveTab(urlTab);
        }
    }, [urlTab]);

    const tabGroups = [
        {
            label: 'Content & Sources',
            tabs: [
                {
                    id: 'rss',
                    label: 'Source Manager',
                    icon: Rss,
                    iconEmoji: '📡',
                    iconBg: 'var(--teal-dim)',
                    component: RSSManager
                },
                {
                    id: 'style',
                    label: 'Style Profile',
                    icon: UserCheck,
                    iconEmoji: '🎨',
                    iconBg: 'var(--accent-glow)',
                    component: StyleProfile
                },
                {
                    id: 'keywords',
                    label: 'Keywords',
                    icon: Tag,
                    iconEmoji: '🏷',
                    iconBg: 'var(--amber-dim)',
                    component: KeywordsManager
                },
            ]
        },
        {
            label: 'Integrations',
            tabs: [
                {
                    id: 'webhooks',
                    label: 'Webhooks',
                    icon: Share2,
                    iconEmoji: '🔗',
                    iconBg: 'rgba(236,72,153,0.1)',
                    component: WebhookManager
                },
                {
                    id: 'monetization',
                    label: 'Monetization',
                    icon: DollarSign,
                    iconEmoji: '💰',
                    iconBg: 'var(--green-dim)',
                    component: MonetizationManager
                },
                {
                    id: 'extension',
                    label: 'Browser Widget',
                    icon: Chrome,
                    iconEmoji: '🌐',
                    iconBg: 'rgba(245,158,11,0.1)',
                    component: ExtensionHelp
                },
            ]
        },
        {
            label: 'System',
            tabs: [
                {
                    id: 'health',
                    label: 'System Health',
                    icon: Activity,
                    iconEmoji: '❤',
                    iconBg: 'var(--green-dim)',
                    component: SystemHealth
                },
                {
                    id: 'llm',
                    label: 'LLM Providers',
                    icon: Zap,
                    iconEmoji: '🤖',
                    iconBg: 'var(--accent-glow)',
                    component: LLMProviders
                },
                {
                    id: 'theme',
                    label: 'Interface',
                    icon: Layout,
                    iconEmoji: '🖥',
                    iconBg: 'var(--surface2)',
                    component: ThemeSelector
                },
                {
                    id: 'advanced',
                    label: 'Advanced',
                    icon: Terminal,
                    iconEmoji: '⚙',
                    iconBg: 'var(--surface2)',
                    component: AdvancedTools
                },
            ]
        },
    ];

    const allTabs = tabGroups.flatMap(group => group.tabs);
    const ActiveContent = allTabs.find(tab => tab.id === activeTab)?.component;

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 animate-fade-in pb-8 lg:pb-20">
            {/* Mobile Tab Selector - Horizontal scrollable tabs for mobile */}
            <div className="lg:hidden px-2 -mx-2 overflow-x-auto">
                <div className="flex gap-2 pb-2 min-w-max">
                    {allTabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${isActive
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : `${activeTheme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'} hover:bg-indigo-50 hover:text-indigo-600`
                                    }`}
                                title={tab.label}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden md:inline">{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Side Navigation for Hub - Hidden on mobile */}
            <div className="hidden lg:block lg:w-64 shrink-0">
                <div className="sticky top-24 space-y-6">
                    <div style={{ padding: '0 4px', marginBottom: 24 }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                            Settings Hub
                        </h1>
                        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginTop: 8 }}>
                            Pulse Pro Configuration
                        </p>
                    </div>

                    {tabGroups.map((group) => (
                        <div key={group.label} className="settings-nav-group">
                            <div className="settings-group-label">
                                {group.label}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {group.tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            className={`settings-nav-item ${isActive ? 'active' : ''}`}
                                            style={{ textAlign: 'left', width: '100%', outline: 'none' }}
                                        >
                                            <div 
                                                className="settings-icon"
                                                style={{
                                                    background: isActive ? 'var(--accent)' : tab.iconBg,
                                                    color: isActive ? '#fff' : 'inherit'
                                                }}
                                            >
                                                {isActive ? <Icon style={{ width: 14, height: 14 }} /> : tab.iconEmoji}
                                            </div>
                                            <span style={{ fontWeight: isActive ? 600 : 400, flex: 1 }}>
                                                {tab.label}
                                            </span>
                                            {isActive && (
                                                <div style={{ width: 3, height: 16, background: 'var(--accent)', borderRadius: 2 }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                <div style={{
                    background: 'var(--bg2)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '32px',
                    minHeight: '600px',
                    boxShadow: '0 20px 40px -20px rgba(0,0,0,0.5)',
                    transition: 'all 0.2s',
                }}>
                    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                        {/* Dynamic Rendering of setting module */}
                        {ActiveContent && <ActiveContent activeTheme={activeTheme} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
