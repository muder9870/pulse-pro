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
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 animate-fade-in pb-8 lg:pb-20">
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
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Side Navigation for Hub - Hidden on mobile */}
            <div className="hidden lg:block lg:w-72 shrink-0">
                <div className="sticky top-24 space-y-4">
                    <div style={{ padding: '0 4px' }}>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                            Settings Hub
                        </h1>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', marginTop: 6 }}>
                            Pulse Pro Configuration
                        </p>
                    </div>

                    {tabGroups.map((group) => (
                        <div key={group.label} style={{ marginBottom: 20 }}>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text3)', padding: '0 4px', marginBottom: 8 }}>
                                {group.label}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {group.tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => handleTabChange(tab.id)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '9px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s',
                                                color: isActive ? 'var(--accent)' : 'var(--text2)',
                                                fontSize: 12,
                                                marginBottom: 2,
                                                border: isActive ? '1px solid rgba(108,99,255,0.2)' : '1px solid transparent',
                                                background: isActive ? 'var(--accent-glow)' : 'transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = 'var(--surface)';
                                                    e.currentTarget.style.color = 'var(--text)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isActive) {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.color = 'var(--text2)';
                                                }
                                            }}
                                        >
                                            <div style={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: 7,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                fontSize: 13,
                                                background: tab.iconBg,
                                            }}>
                                                {tab.iconEmoji}
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 400 }}>
                                                {tab.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 px-2 lg:px-0">
                <div style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    minHeight: '500px',
                    transition: 'all 0.15s',
                }}>
                    <div style={{ maxWidth: 800, margin: '0 auto' }}>
                        {/* Dynamic Rendering of setting module */}
                        {ActiveContent && <ActiveContent activeTheme={activeTheme} />}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsView;
